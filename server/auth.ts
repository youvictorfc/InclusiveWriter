import { Express, Request, Response, NextFunction } from "express";
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: string;
        email: string;
        supabase_id: string;
      };
    }
  }
}

export function setupAuth(app: Express) {
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log('No authorization header found');
        req.isAuthenticated = () => false;
        req.user = undefined;
        return next();
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('Attempting to verify token');

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error('Token verification failed:', authError);
        req.isAuthenticated = () => false;
        req.user = undefined;
        return next();
      }

      console.log('Token verified for user:', user.email);

      // Try to get existing user
      const { data: existingUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_id', user.id)
        .single();

      if (existingUser) {
        console.log('Found existing user:', existingUser);
        req.user = existingUser;
        req.isAuthenticated = () => true;
        return next();
      }

      // If user doesn't exist, create new user
      console.log('Creating new user for:', user.email);
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: user.email,
          supabase_id: user.id,
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('Failed to create user:', createError);
        req.isAuthenticated = () => false;
        req.user = undefined;
        return next();
      }

      console.log('New user created successfully:', newUser);
      req.user = newUser;
      req.isAuthenticated = () => true;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      req.isAuthenticated = () => false;
      req.user = undefined;
      next();
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}