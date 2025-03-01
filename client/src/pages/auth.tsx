import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

// Define form schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

type TabType = 'login' | 'register';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = loginForm.handleSubmit((data) => {
    loginMutation.mutate(data, {
      onError: (error: any) => {
        toast({
          title: "Login Failed",
          description: error.message,
          className: "bg-red-100 border-red-500"
        });
      }
    });
  });

  const onRegister = registerForm.handleSubmit((data) => {
    registerMutation.mutate(data, {
      onError: (error: any) => {
        if (error.message?.includes('Email already registered')) {
          setActiveTab('login');
          toast({
            title: "Account Already Exists",
            description: "This email is already registered. Please log in instead.",
            className: "bg-yellow-100 border-yellow-500"
          });
        } else {
          toast({
            title: "Registration Failed",
            description: error.message || "An error occurred during registration. Please try again.",
            className: "bg-red-100 border-red-500"
          });
        }
      }
    });
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabType);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold">Welcome to NOMW</h2>
          <p className="text-muted-foreground mt-2">
            Sign in to access the Inclusive Language Assistant
          </p>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={onLogin} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={onRegister} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Choose a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-gradient-to-br from-primary/90 via-violet-500 to-primary relative hidden md:block">
          <div className="absolute inset-0 p-8 text-white flex flex-col justify-center">
            <h3 className="text-2xl font-bold">Inclusive Language Assistant</h3>
            <p className="mt-4 text-primary-foreground/90">
              Enhance your communication with AI-powered inclusive language suggestions
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}