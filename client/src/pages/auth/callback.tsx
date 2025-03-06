import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback...');

        // Get the current URL parameters
        const params = new URLSearchParams(window.location.hash.substring(1));
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          // Handle verification errors
          toast({
            title: "Verification Failed",
            description: errorDescription || "Failed to verify email. Please try again.",
            variant: "destructive"
          });
          setLocation('/auth');
          return;
        }

        // Get the session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user?.email_confirmed_at) {
          console.log('User verified successfully');
          // If the user is verified, show success message and redirect to home
          toast({
            title: "Email Verified",
            description: "Your email has been verified successfully. Welcome!",
            className: "bg-green-100 border-green-500",
          });
          setLocation('/');
        } else {
          console.log('User verification pending');
          // If verification is pending, redirect to login
          toast({
            title: "Verification Required",
            description: "Please verify your email to continue.",
            className: "bg-yellow-100 border-yellow-500",
          });
          setLocation('/auth');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        toast({
          title: "Error",
          description: "An error occurred during verification. Please try again.",
          variant: "destructive"
        });
        setLocation('/auth');
      }
    };

    handleAuthCallback();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}