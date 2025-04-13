import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function YouTubeCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    // Process the auth code (Google OAuth returns codes in the URL search params)
    const processAuth = async () => {
      try {
        // Verify we have a code in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state === 'youtube_auth') {
          // Successfully got the auth code
          setStatus('success');
          setMessage('YouTube authorization successful! Redirecting...');
          
          // Store the auth code in local storage to complete the flow
          localStorage.setItem('youtube_auth_code', code);
          
          // Let the toast appear before redirecting
          setTimeout(() => {
            toast({
              title: 'YouTube Connected',
              description: 'Your YouTube account has been successfully connected.'
            });
            navigate('/admin/youtube-settings');
          }, 1500);
        } else if (urlParams.get('error')) {
          // Handle error case
          const error = urlParams.get('error');
          
          setStatus('error');
          setMessage(`Authentication failed: ${error || 'Unknown error'}`);
          
          setTimeout(() => {
            toast({
              variant: 'destructive',
              title: 'Authentication Failed',
              description: 'There was a problem connecting to YouTube.'
            });
            navigate('/admin/youtube-settings');
          }, 2000);
        } else {
          // No code or error found, likely direct page access
          setStatus('error');
          setMessage('No authentication data found. Please try again.');
          
          setTimeout(() => {
            navigate('/admin/youtube-settings');
          }, 2000);
        }
      } catch (error) {
        console.error('Error processing YouTube authentication:', error);
        setStatus('error');
        setMessage('An error occurred while processing authentication.');
        
        setTimeout(() => {
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'An unexpected error occurred during YouTube authentication.'
          });
          navigate('/admin/youtube-settings');
        }, 2000);
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="container py-10 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            YouTube Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          {status === 'processing' && (
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          )}
          <p className="text-center text-muted-foreground">
            {message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 