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

    // Get initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          if (!session.user.email_confirmed_at) {
            // If user is not verified, sign them out
            await supabase.auth.signOut();
            setUser(null);
            toast({
              title: "Email verification required",
              description: "Please check your email and verify your account before signing in.",
              className: "bg-yellow-100 border-yellow-500",
            });
          } else {
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          if (!session.user.email_confirmed_at) {
            await supabase.auth.signOut();
            setUser(null);
            toast({
              title: "Email verification required",
              description: "Please verify your email address before signing in.",
              className: "bg-yellow-100 border-yellow-500",
            });
          } else {
            setUser(session.user);
          }
        }
      } else if (event === 'SIGNED_OUT') {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error("Please verify your email address before signing in.");
      }

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
      const siteUrl = import.meta.env.VITE_APP_URL;

      if (!siteUrl) {
        throw new Error("Application URL not configured");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      // Sign out immediately after registration
      await supabase.auth.signOut();
      setUser(null);

      toast({
        title: "Check your email",
        description: "We've sent you a verification link to complete your registration. Please verify your email address to sign in.",
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

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