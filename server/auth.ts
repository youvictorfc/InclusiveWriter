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
  return randomBytes(32).toString('hex');
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
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
        // Explicitly check for email verification before allowing login
        if (!user.isVerified) {
          return done(null, false, { 
            message: "Please verify your email before logging in. Check your inbox for the verification link.",
            code: "EMAIL_NOT_VERIFIED"
          });
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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: info.message || "Authentication failed",
          code: info.code
        });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res) => {
    try {
      console.log('Registration attempt:', { username: req.body.username, email: req.body.email });

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Username already exists. Please choose a different username.",
          code: "USERNAME_EXISTS"
        });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ 
          message: "Email already registered. Please use a different email or try logging in.",
          code: "EMAIL_EXISTS"
        });
      }

      const verificationToken = generateVerificationToken();
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hour expiry

      console.log('Creating user with data:', {
        username: req.body.username,
        email: req.body.email,
        verificationToken,
        verificationExpires
      });

      const passwordHash = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        passwordHash,
        verificationToken,
        verificationExpires,
        isVerified: false
      });

      console.log('User created successfully, sending verification email...');

      try {
        await sendVerificationEmail(user.email, verificationToken);
        console.log('Verification email sent successfully');
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        // Even if email fails, we want to let the user know their account was created
        return res.status(201).json({
          success: true,
          message: "Account created but we couldn't send the verification email. Please try logging in later or contact support.",
          username: user.username,
          error: emailError.message
        });
      }

      res.status(201).json({ 
        success: true,
        message: "Registration successful. Please check your email to verify your account.",
        username: user.username
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false,
        message: "Registration failed. Please try again later.",
        error: error.message 
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
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (user.verificationExpires && new Date() > new Date(user.verificationExpires)) {
        return res.status(400).json({ message: "Verification token has expired" });
      }

      await storage.verifyUser(user.id);

      res.json({ message: "Email verified successfully. You can now log in." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
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

  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.user.id);

      if (!user || !(await comparePasswords(currentPassword, user.passwordHash))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, newPasswordHash);

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}