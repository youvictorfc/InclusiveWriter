import { createClient } from '@supabase/supabase-js';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with session handling
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Store the session in localStorage
    if (session) {
      localStorage.setItem('supabase.auth.token', session.access_token);

      // Ensure user exists in our database
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to verify user in database');
      }
    }
  } else if (event === 'SIGNED_OUT') {
    // Clear the session from localStorage
    localStorage.removeItem('supabase.auth.token');
    window.location.href = '/auth';
  }
});

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    localStorage.setItem('supabase.auth.token', session.access_token);
  }
});