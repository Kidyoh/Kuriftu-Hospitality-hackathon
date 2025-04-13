import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  loadYouTubeApi, 
  isYouTubeAuthenticated, 
  authenticateWithYouTube,
  uploadVideoToYouTube
} from '@/utils/youtubeUtils';
import { toast } from '@/hooks/use-toast';

interface YouTubeContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  authenticate: () => Promise<boolean>;
  uploadVideo: (
    file: File,
    title: string,
    description?: string,
    tags?: string[],
    onProgress?: (progress: number) => void
  ) => Promise<string | null>;
}

const YouTubeContext = createContext<YouTubeContextType | null>(null);

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
}

interface YouTubeProviderProps {
  children: ReactNode;
}

export function YouTubeProvider({ children }: YouTubeProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize YouTube API
  useEffect(() => {
    const initYouTube = async () => {
      try {
        setIsLoading(true);
        const apiLoaded = await loadYouTubeApi();
        if (apiLoaded) {
          setIsAuthenticated(isYouTubeAuthenticated());
        }
      } catch (error) {
        console.error('Error initializing YouTube API:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initYouTube();
  }, []);

  // Authenticate with YouTube
  const authenticate = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await authenticateWithYouTube();
      setIsAuthenticated(success);
      
      if (success) {
        toast({
          title: "YouTube authentication successful",
          description: "You can now upload videos directly to YouTube."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Could not authenticate with YouTube. Please try again."
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error authenticating with YouTube:', error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "An error occurred during YouTube authentication."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload video to YouTube
  const uploadVideo = async (
    file: File,
    title: string,
    description: string = '',
    tags: string[] = [],
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    // Check authentication first
    if (!isAuthenticated) {
      const authSuccess = await authenticate();
      if (!authSuccess) return null;
    }
    
    try {
      return await uploadVideoToYouTube(file, title, description, tags, onProgress);
    } catch (error) {
      console.error('Error uploading video to YouTube:', error);
      
      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        // Check for YouTube channel required error
        if (error.message.includes('YouTube channel required')) {
          toast({
            variant: "destructive",
            title: "YouTube Channel Required",
            description: "You need to create a YouTube channel before uploading videos. Please visit YouTube.com to set up your channel."
          });
        } else if (error.message.includes('Unauthorized')) {
          toast({
            variant: "destructive",
            title: "Authorization Failed",
            description: "YouTube authentication failed. Please try reconnecting your account."
          });
          // Reset authentication state to trigger re-authentication
          setIsAuthenticated(false);
        } else {
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: error.message || "Failed to upload video to YouTube. Please try again."
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Failed to upload video to YouTube. Please try again."
        });
      }
      
      return null;
    }
  };

  const value: YouTubeContextType = {
    isAuthenticated,
    isLoading,
    authenticate,
    uploadVideo
  };

  return (
    <YouTubeContext.Provider value={value}>
      {children}
    </YouTubeContext.Provider>
  );
} 