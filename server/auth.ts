import { Express, Request, Response, NextFunction } from "express";
import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
        id: number;  // Changed to number to match database schema
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

      try {
        // Try to get existing user from our database
        const existingUser = await db.select().from(users).where(eq(users.supabase_id, user.id));

        if (existingUser.length > 0) {
          console.log('Found existing user:', existingUser[0]);
          req.user = {
            id: existingUser[0].id,
            email: existingUser[0].email,
            supabase_id: existingUser[0].supabase_id,
          };
          req.isAuthenticated = () => true;
          return next();
        }

        // If user doesn't exist, create new user
        console.log('Creating new user for:', user.email);
        const newUsers = await db.insert(users).values({
          email: user.email!,
          supabase_id: user.id,
        }).returning();

        if (!newUsers.length) {
          throw new Error('Failed to create user');
        }

        const newUser = newUsers[0];
        console.log('New user created successfully:', newUser);

        req.user = {
          id: newUser.id,
          email: newUser.email,
          supabase_id: newUser.supabase_id,
        };
        req.isAuthenticated = () => true;
        next();
      } catch (error) {
        console.error('Database operation failed:', error);
        req.isAuthenticated = () => false;
        req.user = undefined;
        next();
      }
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