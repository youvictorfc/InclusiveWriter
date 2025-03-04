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
      console.log('Verifying token:', token.substring(0, 10) + '...');

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
        if (userError.code === 'PGRST116' || userError.message?.includes('does not exist')) {
          console.log('Creating new user record for:', user.email);

          // Create users table if it doesn't exist
          await supabase.schema.createTable('users', {
            id: { type: 'serial', primaryKey: true },
            email: { type: 'text', notNull: true },
            supabase_id: { type: 'text', notNull: true, unique: true },
            created_at: { type: 'timestamp', notNull: true, default: 'now()' }
          }).catch(() => {
            // Table might already exist, continue
          });

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

          console.log('New user created:', newUser);
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

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}