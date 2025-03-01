import { createClient } from '@supabase/supabase-js';

// Log environment variable status (without exposing values)
console.log('Server Supabase Environment Variables Status:', {
  hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
  hasUrl: !!process.env.VITE_SUPABASE_URL
});

if (!process.env.VITE_SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable on server');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Initialize Supabase admin client for server-side operations
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

// Test the admin client connection
supabaseAdmin.auth.admin.listUsers().then(({ data, error }) => {
  if (error) {
    console.error('Server Supabase initialization error:', error);
  } else {
    console.log('Server Supabase client initialized successfully');
  }
});