import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function AuthPage() {
  const { user } = useAuth();

  // Redirect to home if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold">Welcome to NOMW</h2>
          <p className="text-muted-foreground mt-2">
            Sign in to access the Inclusive Language Assistant
          </p>
          
          <Tabs defaultValue="login" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-4 mt-4">
                <p>Login form coming soon</p>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="space-y-4 mt-4">
                <p>Registration form coming soon</p>
              </div>
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
