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
      detectSessionInUrl: true
    }
  }
);

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any user data from local storage
    localStorage.removeItem('user');
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // You can store minimal user info if needed
    if (session?.user) {
      localStorage.setItem('user', JSON.stringify({
        id: session.user.id,
        email: session.user.email
      }));
    }
  }
});