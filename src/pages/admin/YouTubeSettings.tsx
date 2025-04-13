import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { setupYouTubeApiConfig } from '@/utils/youtubeUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Info, Youtube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Form schema for YouTube API credentials
const youtubeApiSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

export default function YouTubeSettings() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  
  const form = useForm<z.infer<typeof youtubeApiSchema>>({
    resolver: zodResolver(youtubeApiSchema),
    defaultValues: {
      apiKey: "",
      clientId: "",
      clientSecret: "",
    }
  });
  
  // Check if user has admin role
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "You do not have permission to access this page."
      });
      navigate('/dashboard');
    }
  }, [profile, navigate]);
  
  // Load existing configuration if available
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('config_value')
          .eq('config_key', 'youtube_api_config')
          .single();
          
        if (!error && data) {
          const config = JSON.parse(data.config_value);
          form.reset({
            apiKey: config.apiKey || '',
            clientId: config.clientId || '',
            clientSecret: config.clientSecret || '',
          });
          setHasConfig(true);
        }
      } catch (error) {
        console.error('Error loading YouTube API configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, [form]);
  
  const onSubmit = async (values: z.infer<typeof youtubeApiSchema>) => {
    setIsSaving(true);
    
    try {
      const success = await setupYouTubeApiConfig({
        apiKey: values.apiKey,
        clientId: values.clientId,
        clientSecret: values.clientSecret,
      });
      
      if (success) {
        toast({
          title: "Settings saved",
          description: "YouTube API configuration has been saved successfully."
        });
        setHasConfig(true);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving YouTube API configuration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save YouTube API configuration. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-10 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">YouTube Integration</h1>
          <p className="text-muted-foreground">
            Configure YouTube API for direct video uploads
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/settings')}>
          Back to Settings
        </Button>
      </div>
      
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>YouTube API Configuration</AlertTitle>
        <AlertDescription>
          To enable direct uploads to YouTube, you need to create a project in the 
          <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="underline mx-1">Google Cloud Console</a>
          and enable the YouTube Data API v3.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="credentials">API Credentials</TabsTrigger>
          <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>YouTube API Credentials</CardTitle>
              <CardDescription>
                Enter your YouTube API credentials to enable video uploads
              </CardDescription>
            </CardHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your YouTube API Key" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Used for accessing the YouTube API services
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your OAuth 2.0 Client ID" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          OAuth 2.0 client ID for authentication
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter your OAuth 2.0 Client Secret" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          OAuth 2.0 client secret (keep this secure)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                
                <CardFooter className="flex justify-between">
                  <div>
                    {hasConfig && (
                      <span className="text-sm text-muted-foreground">
                        Configuration exists and will be updated
                      </span>
                    )}
                  </div>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to set up YouTube API integration
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Step 1: Create a Google Cloud Project</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> and create a new project.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Step 2: Enable the YouTube Data API</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    In your Google Cloud project, navigate to "APIs & Services"  "Library" and search for "YouTube Data API v3". Click on it and enable the API.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Step 3: Create API Credentials</h3>
                  <ol className="text-sm text-muted-foreground mt-1 list-decimal list-inside space-y-2">
                    <li>Go to "APIs & Services"  "Credentials"</li>
                    <li>Click "Create Credentials" and select "API key"</li>
                    <li>Copy the API key and save it</li>
                    <li>Click "Create Credentials" again and select "OAuth client ID"</li>
                    <li>Select "Web application" as the application type</li>
                    <li>Add authorized JavaScript origins (your application URL)</li>
                    <li>Add authorized redirect URIs (your application URL)</li>
                    <li>Copy the Client ID and Client Secret</li>
                  </ol>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Step 4: Configure Consent Screen</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    In "OAuth consent screen", configure the app information and add the YouTube API scopes:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                    <li>https://www.googleapis.com/auth/youtube.upload</li>
                    <li>https://www.googleapis.com/auth/youtube</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Step 5: Enter Credentials</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the API Key, Client ID, and Client Secret in the form on the "API Credentials" tab.
                  </p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://developers.google.com/youtube/v3/getting-started', '_blank')}
              >
                <Youtube className="mr-2 h-4 w-4" />
                View YouTube API Documentation
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 