import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { User, Session } from '@supabase/supabase-js';
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.email_confirmed_at) {
        // If user is not verified, sign them out
        supabase.auth.signOut();
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        if (session?.user && !session.user.email_confirmed_at) {
          // If user is not verified, sign them out
          await supabase.auth.signOut();
          setUser(null);
          toast({
            title: "Email not verified",
            description: "Please verify your email address before signing in.",
            className: "bg-yellow-100 border-yellow-500",
          });
        } else {
          setUser(session?.user ?? null);
        }
      } else {
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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