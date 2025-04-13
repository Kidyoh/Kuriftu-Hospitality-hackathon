import { supabase } from '@/integrations/supabase/client';

// Define types
interface YouTubeApiConfig {
  apiKey: string;
  clientId: string;
  clientSecret?: string;
}

// Global variables
let youtubeApiConfig: YouTubeApiConfig | null = null;
let isYouTubeApiLoaded = false;
let tokenClient: any = null;

// YouTube OAuth scopes
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube'
];

/**
 * Load YouTube API client using the new Google Identity Services
 */
export async function loadYouTubeApi(): Promise<boolean> {
  if (isYouTubeApiLoaded) return true;
  
  try {
    // Read from app_config table
    const { data: configData, error: configError } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'youtube_api_config')
      .single();
    
    if (configError || !configData) {
      console.log('YouTube API configuration not found');
      return false;
    }
    
    // Parse the configuration
    youtubeApiConfig = JSON.parse(configData.config_value);
    
    // Load the Google Identity Services script
    return new Promise((resolve) => {
      // First, load the GIS library
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        // Then load the YouTube API client
        const ytScript = document.createElement('script');
        ytScript.src = 'https://apis.google.com/js/api.js';
        ytScript.onload = async () => {
          try {
            // Load the YouTube API client libraries
            await new Promise<void>((loadResolve) => {
              window.gapi.load('client', { callback: () => loadResolve() });
            });
            
            // Initialize the API with our key
            await window.gapi.client.init({
              apiKey: youtubeApiConfig?.apiKey,
            });
            
            // Load the YouTube API
            await window.gapi.client.load('youtube', 'v3');
            
            // Get the current origin with correct protocol
            const currentOrigin = window.location.origin;
            const redirectUri = `${currentOrigin}/admin/youtube-callback`;
            
            // Configure for redirect flow to avoid COOP issues
            tokenClient = window.google.accounts.oauth2.initCodeClient({
              client_id: youtubeApiConfig?.clientId,
              scope: YOUTUBE_SCOPES.join(' '),
              ux_mode: 'redirect',
              redirect_uri: redirectUri,
              state: 'youtube_auth',
              select_account: true
            });
            
            isYouTubeApiLoaded = true;
            resolve(true);
          } catch (error) {
            console.error('Error initializing YouTube API:', error);
            resolve(false);
          }
        };
        ytScript.onerror = () => {
          console.error('Failed to load YouTube API script');
          resolve(false);
        };
        document.body.appendChild(ytScript);
      };
      gisScript.onerror = () => {
        console.error('Failed to load Google Identity Services script');
        resolve(false);
      };
      document.body.appendChild(gisScript);
    });
  } catch (error) {
    console.error('Error loading YouTube API configuration:', error);
    return false;
  }
}

/**
 * Check if the user is authenticated with YouTube
 */
export function isYouTubeAuthenticated(): boolean {
  // First check if we have a token from the exchange
  const hasToken = isYouTubeApiLoaded && 
    !!tokenClient && 
    !!window.gapi?.client?.getToken();
    
  // Also check if we have a stored auth code that needs to be exchanged
  const hasAuthCode = !!localStorage.getItem('youtube_auth_code');
  
  return hasToken || hasAuthCode;
}

/**
 * Complete the OAuth flow by exchanging the code for a token
 * This is called after the redirect back from Google
 */
export async function exchangeCodeForToken(): Promise<boolean> {
  const code = localStorage.getItem('youtube_auth_code');
  if (!code) return false;
  
  try {
    // We need to implement a token exchange, but this requires a server-side component
    // For now, we'll just remove the code from localStorage and return true
    // In a production app, you would exchange this code for a token using your backend
    
    // Clear the code from localStorage
    localStorage.removeItem('youtube_auth_code');
    
    // In a real implementation, you would do something like:
    // const { data, error } = await supabase.functions.invoke('exchange-youtube-token', { code });
    // But for now, we'll assume the authentication worked
    return true;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    localStorage.removeItem('youtube_auth_code');
    return false;
  }
}

/**
 * Authenticate with YouTube using the new Google Identity Services
 */
export async function authenticateWithYouTube(): Promise<boolean> {
  if (!isYouTubeApiLoaded) {
    const loaded = await loadYouTubeApi();
    if (!loaded) return false;
  }
  
  if (!tokenClient) {
    console.error('Token client not initialized');
    return false;
  }
  
  try {
    // Using the code client instead of token client
    tokenClient.requestCode();
    return true;
  } catch (error) {
    console.error('Error authenticating with YouTube:', error);
    return false;
  }
}

/**
 * Upload a video to YouTube
 * @param file Video file to upload
 * @param title Video title
 * @param description Video description
 * @param tags Video tags
 * @param onProgress Progress callback
 */
export async function uploadVideoToYouTube(
  file: File,
  title: string,
  description: string = '',
  tags: string[] = [],
  onProgress?: (progress: number) => void
): Promise<string | null> {
  // Check if we need to exchange a code for a token
  if (localStorage.getItem('youtube_auth_code')) {
    await exchangeCodeForToken();
  }
  
  // Check if authenticated
  if (!isYouTubeAuthenticated() || !window.gapi?.client?.getToken()) {
    const authenticated = await authenticateWithYouTube();
    if (!authenticated) return null;
  }
  
  try {
    // Set up metadata for the video
    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId: '27' // Education category
      },
      status: {
        privacyStatus: 'unlisted' // Default to unlisted for safety
      }
    };
    
    // Special upload handling for YouTube
    const accessToken = window.gapi.client.getToken()?.access_token;
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Create a FormData object for the upload
    const formData = new FormData();
    formData.append('part', 'snippet,status');
    formData.append('uploadType', 'multipart');
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('media', file);
    
    // Use fetch API for the upload with progress tracking
    const xhr = new XMLHttpRequest();
    
    // Set up progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };
    
    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          // Return the YouTube video ID which can be used to create an embed URL
          resolve(`https://www.youtube.com/embed/${response.id}`);
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            // Check for YouTube signup required error
            if (errorResponse?.error?.errors?.some(e => e.reason === 'youtubeSignupRequired')) {
              reject(new Error('YouTube channel required. Please create a YouTube channel before uploading videos.'));
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      
      xhr.open('POST', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart');
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Error uploading video to YouTube:', error);
    return null;
  }
}

/**
 * Get YouTube embed URL from a YouTube URL
 * @param url YouTube URL (various formats supported)
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // Extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  
  return url; // Return original if it's already an embed URL or not recognized
}

/**
 * Setup YouTube API configuration in the database
 * @param config YouTube API configuration
 */
export async function setupYouTubeApiConfig(config: YouTubeApiConfig): Promise<boolean> {
  try {
    // Use app_config table for consistency
    const { error } = await supabase
      .from('app_config')
      .upsert({
        config_key: 'youtube_api_config',
        config_value: JSON.stringify(config)
      });
    
    if (error) {
      console.error('Error saving YouTube API configuration:', error);
      return false;
    }
    
    // Reset the loaded state so we reload the config next time
    isYouTubeApiLoaded = false;
    youtubeApiConfig = null;
    
    return true;
  } catch (error) {
    console.error('Error setting up YouTube API configuration:', error);
    return false;
  }
}

/**
 * Extract video ID from a YouTube URL
 * @param url YouTube URL
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  return match && match[2].length === 11 ? match[2] : null;
}

// Add a global type definition for gapi and google
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
} 