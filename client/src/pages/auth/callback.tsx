import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          // If the user is verified, redirect to home
          setLocation('/');
        } else {
          // If there's no session, redirect to login
          setLocation('/auth');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setLocation('/auth');
      }
    };

    handleAuthCallback();
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
