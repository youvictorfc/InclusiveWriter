import { Express } from "express";
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
}

// Create Supabase admin client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Add type definitions for Express Request
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: number;
        email: string;
        supabase_id: string;
      };
    }
  }
}

export function setupAuth(app: Express) {
  // Middleware to authenticate requests using Supabase JWT
  app.use(async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log('No authorization header found');
        req.isAuthenticated = () => false;
        return next();
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('Verifying token...');

      // Verify the JWT token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error('Token verification failed:', authError);
        req.isAuthenticated = () => false;
        return next();
      }

      console.log('Token verified, getting user data for:', user.id);

      // Get user data from your users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, supabase_id')
        .eq('supabase_id', user.id)
        .single();

      if (userError) {
        // If user doesn't exist, create one
        if (userError.code === 'PGRST116') {
          console.log('Creating new user record for:', user.email);
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              email: user.email,
              supabase_id: user.id
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create user:', createError);
            req.isAuthenticated = () => false;
            return next();
          }

          req.user = newUser;
          req.isAuthenticated = () => true;
          return next();
        }

        console.error('Failed to get user data:', userError);
        req.isAuthenticated = () => false;
        return next();
      }

      console.log('User data retrieved:', userData);
      req.user = userData;
      req.isAuthenticated = () => true;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      req.isAuthenticated = () => false;
      next();
    }
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: req.body.email,
        password: req.body.password
      });
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(201).json({ message: "Registration successful" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: req.body.email,
        password: req.body.password,
      });
      if (error) {
        return res.status(401).json({ message: error.message });
      }

      // Get user data after successful login
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, supabase_id')
        .eq('supabase_id', data.user.id)
        .single();

      if (userError || !userData) {
        return res.status(500).json({ message: "Failed to get user data" });
      }

      res.json({
        access_token: data.session.access_token,
        user: userData
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/logout", async (req, res) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.sendStatus(200);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { currentPassword, newPassword } = req.body;

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}