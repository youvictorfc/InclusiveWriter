import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  username?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initial session check
  useEffect(() => {
    console.log('Checking initial session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check complete:', session ? 'has session' : 'no session');
      setIsInitializing(false);
    }).catch(error => {
      console.error('Session check error:', error);
      setIsInitializing(false);
    });
  }, []);

  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('Auth query result:', user ? 'user found' : 'no user');
        if (error) throw error;
        return user;
      } catch (error) {
        console.error('Auth query error:', error);
        return null;
      }
    },
    enabled: !isInitializing,
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'has session' : 'no session');
      await refetch();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      return data.user;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Login Successful",
        description: "Welcome back!",
        className: "bg-green-100 border-green-500",
      });
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message,
        className: "bg-red-100 border-red-500",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
          },
        },
      });

      if (error) throw error;
      return authData.user;
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "Please check your email for verification instructions.",
        className: "bg-green-100 border-green-500",
      });
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message,
        className: "bg-red-100 border-red-500",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        className: "bg-green-100 border-green-500",
      });
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: error.message,
        className: "bg-red-100 border-red-500",
      });
    },
  });

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Initializing authentication...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
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