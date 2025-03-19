import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import { sendVerificationEmail } from "./email";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours default
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.passwordHash))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        if (!user.isVerified) {
          return done(null, false, { message: "Please verify your email address before logging in" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.username || !req.body.email || !req.body.password) {
        return res.status(400).json({ 
          message: "Username, email, and password are required." 
        });
      }

      // Check existing user
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check existing email
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const verificationToken = generateVerificationToken();
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + 24);

      const passwordHash = await hashPassword(req.body.password);

      let user;
      try {
        user = await storage.createUser({
          ...req.body,
          passwordHash,
          isVerified: false,
          verificationToken,
          verificationExpires,
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          message: "Failed to create user account. Please try again." 
        });
      }

      // Send verification email
      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (emailError: any) {
        console.error('Email error:', emailError);
        // If email fails, delete the created user
        await storage.deleteUser(user.id);

        // Provide more specific error messages based on the error type
        if (emailError.code === 'EAUTH') {
          return res.status(500).json({ 
            message: "Email server authentication failed. Please contact support." 
          });
        } else if (emailError.code === 'ESOCKET') {
          return res.status(500).json({ 
            message: "Unable to connect to email server. Please try again later." 
          });
        } else {
          return res.status(500).json({ 
            message: "Failed to send verification email. Please try registering again." 
          });
        }
      }

      res.status(201).json({ 
        message: "Registration successful. Please check your email to verify your account.",
        username: user.username
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: "An unexpected error occurred. Please try again." 
      });
    }
  });

  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      if (user.verificationExpires && new Date() > new Date(user.verificationExpires)) {
        return res.status(400).json({ message: "Verification token has expired" });
      }

      await storage.verifyUser(user.id);

      res.json({ message: "Email verified successfully. You can now log in." });
    } catch (error: any) {
      console.error('Verification error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: SelectUser) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) return next(err);

        // If remember me is checked, extend session to 30 days
        if (req.body.rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}