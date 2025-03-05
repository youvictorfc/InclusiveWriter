import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { User } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    // Check initial session and handle token refresh
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error fetching session:', error);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          // Store the session token
          localStorage.setItem('supabase.auth.token', session.access_token);

          // Verify user exists in backend
          const response = await fetch('/api/user', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!response.ok) {
            console.error('Failed to verify user in backend');
            setUser(null);
          } else {
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Store the new session token
          localStorage.setItem('supabase.auth.token', session.access_token);

          // Verify user in backend
          const response = await fetch('/api/user', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!response.ok) {
            console.error('Failed to verify user in backend');
            setUser(null);
            toast({
              title: "Authentication Error",
              description: "Failed to verify user. Please try logging in again.",
              className: "bg-red-100 border-red-500",
            });
            await supabase.auth.signOut();
          } else {
            setUser(session.user);
          }
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        localStorage.removeItem('supabase.auth.token');
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
        className: "bg-green-100 border-green-500",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        className: "bg-red-100 border-red-500",
      });
      setError(error);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a verification link to complete your registration.",
        className: "bg-green-100 border-green-500",
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        className: "bg-red-100 border-red-500",
      });
      setError(error);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local storage
      localStorage.removeItem('supabase.auth.token');

      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
        className: "bg-green-100 border-green-500",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        className: "bg-red-100 border-red-500",
      });
      setError(error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}