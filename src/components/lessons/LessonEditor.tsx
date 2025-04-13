import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Save, VideoIcon, Upload, X, Youtube, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VideoPlayer } from '@/components/lessons/VideoPlayer';
import { getYouTubeEmbedUrl } from '@/utils/youtubeUtils';
import { useYouTube } from '@/components/youtube/YouTubeProvider';

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  video_url: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
  sequence_order: z.coerce.number().int().min(0, "Sequence order must be a positive number"),
});

type LessonEditorProps = {
  isOpen: boolean;
  onClose: () => void;
  lessonId?: string;
  courseId: string;
  onSaved: () => void;
};

export function LessonEditor({ isOpen, onClose, lessonId, courseId, onSaved }: LessonEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadTab, setUploadTab] = useState<'supabase' | 'youtube'>('supabase');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  
  // Use the YouTube context
  const { isAuthenticated: youtubeAuthenticated, authenticate: handleYouTubeAuth, uploadVideo: uploadYouTubeVideo } = useYouTube();
  
  const form = useForm<z.infer<typeof lessonSchema>>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      video_url: "",
      sequence_order: 0,
    }
  });

  // Load lesson data when editing an existing lesson
  useEffect(() => {
    if (isOpen && lessonId) {
      loadLessonData(lessonId);
    } else if (isOpen) {
      // For new lessons, get the next sequence number
      getNextSequenceNumber();
    }
  }, [isOpen, lessonId]);

  // Preview video when URL changes
  useEffect(() => {
    const videoUrl = form.watch('video_url');
    if (videoUrl) {
      // If it's a YouTube URL, convert it to embed URL
      const embedUrl = getYouTubeEmbedUrl(videoUrl);
      setVideoPreviewUrl(embedUrl);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [form.watch('video_url')]);

  // Determine if URL is a YouTube embed or direct video
  const isYouTubeEmbed = useMemo(() => {
    if (!videoPreviewUrl) return false;
    return videoPreviewUrl.includes('youtube.com/embed/') || videoPreviewUrl.includes('youtu.be/');
  }, [videoPreviewUrl]);

  const getNextSequenceNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('sequence_order')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: false })
        .limit(1);
        
      if (!error && data && data.length > 0) {
        form.setValue('sequence_order', (data[0].sequence_order || 0) + 1);
      } else {
        form.setValue('sequence_order', 0);
      }
    } catch (error) {
      console.error('Error getting next sequence number:', error);
    }
  };

  const loadLessonData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        form.reset({
          title: data.title || '',
          description: data.description || '',
          video_url: data.video_url || '',
          sequence_order: data.sequence_order || 0,
        });
        
        // Update video preview
        if (data.video_url) {
          const embedUrl = getYouTubeEmbedUrl(data.video_url);
          setVideoPreviewUrl(embedUrl);
        }
      }
    } catch (error) {
      console.error('Error loading lesson data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load lesson data. Please try again."
      });
    }
  };

  const handleUploadVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validVideoTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a valid video file (MP4, WebM, OGG, or QuickTime)."
      });
      return;
    }
    
    // Check file size (limit to 100MB for standard uploads)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Video file size must be less than 100MB. For larger files, use YouTube upload."
      });
      return;
    }
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      if (uploadTab === 'youtube') {
        // Use the YouTube context to upload
        const embedUrl = await uploadYouTubeVideo(
          file,
          form.getValues('title') || file.name,
          form.getValues('description') || '',
          [],
          (progress) => setProgress(progress)
        );
        
        if (embedUrl) {
          form.setValue('video_url', embedUrl);
          setVideoPreviewUrl(embedUrl);
          toast({
            title: "Video uploaded to YouTube",
            description: "The video has been uploaded and linked successfully."
          });
        } else {
          throw new Error('Failed to upload video to YouTube');
        }
      } else {
        // Upload to Supabase Storage with progress tracking using fetch and FormData
        const bucketName = 'public'; // Use the 'public' bucket which is created by default
        const folderPath = `courses/${courseId}/videos`;
        const filePath = `${folderPath}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        
        // Set fake progress for user feedback since we can't track actual progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            // Progress up to 90% in small increments, reserving the last 10% for final completion
            const increment = Math.random() * 5 + 1; // Random increment between 1-6%
            return prev < 90 ? Math.min(90, prev + increment) : prev;
          });
        }, 500);
        
        try {
          // Upload the file directly using standard Supabase method
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true // Use upsert in case file exists
            });
          
          // Clear the fake progress interval
          clearInterval(progressInterval);
          
          if (error) throw error;
          
          // Set to 100% when complete
          setProgress(100);
          
          // Get the public URL
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
            
          if (publicUrlData?.publicUrl) {
            form.setValue('video_url', publicUrlData.publicUrl);
            setVideoPreviewUrl(publicUrlData.publicUrl);
            toast({
              title: "Video uploaded",
              description: "The video has been uploaded successfully."
            });
          } else {
            throw new Error('Could not get public URL for uploaded video');
          }
        } catch (error) {
          clearInterval(progressInterval);
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: "Storage bucket not found. Please use YouTube upload instead."
          });
          throw error;
        }
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your video. Please try again."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof lessonSchema>) => {
    setIsLoading(true);
    
    try {
      if (lessonId) {
        // Update existing lesson
        const { error } = await supabase
          .from('course_lessons')
          .update({
            title: values.title,
            description: values.description,
            video_url: values.video_url,
            sequence_order: values.sequence_order,
          })
          .eq('id', lessonId);
          
        if (error) throw error;
        
        toast({
          title: "Lesson updated",
          description: "The lesson has been updated successfully."
        });
      } else {
        // Create new lesson
        const { error } = await supabase
          .from('course_lessons')
          .insert({
            title: values.title,
            description: values.description,
            video_url: values.video_url,
            sequence_order: values.sequence_order,
            course_id: courseId,
          });
          
        if (error) throw error;
        
        toast({
          title: "Lesson created",
          description: "The lesson has been created successfully."
        });
      }
      
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save lesson. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg md:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{lessonId ? 'Edit Lesson' : 'Add New Lesson'}</SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Lesson title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this lesson covers..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sequence_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sequence Order</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="1"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video</FormLabel>
                  <div className="space-y-4">
                    <Tabs 
                      defaultValue={uploadTab} 
                      onValueChange={(value) => setUploadTab(value as 'supabase' | 'youtube')}
                      className="w-full"
                    >
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="supabase">Supabase Storage</TabsTrigger>
                        <TabsTrigger value="youtube">YouTube</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="supabase" className="space-y-4">
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Enter video URL or upload a video" 
                              {...field}
                              value={field.value || ''}
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  form.setValue('video_url', '');
                                  setVideoPreviewUrl(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear URL</span>
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('supabase-upload')?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading {progress}%
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload to Supabase
                            </>
                          )}
                        </Button>
                        <input
                          id="supabase-upload"
                          type="file"
                          accept="video/*"
                          onChange={handleUploadVideo}
                          className="hidden"
                        />
                      </TabsContent>
                      
                      <TabsContent value="youtube" className="space-y-4">
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="YouTube URL or upload to get a link" 
                              {...field}
                              value={field.value || ''}
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  form.setValue('video_url', '');
                                  setVideoPreviewUrl(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear URL</span>
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        
                        <div className="flex flex-wrap gap-2">
                          {!youtubeAuthenticated && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleYouTubeAuth}
                            >
                              <Youtube className="mr-2 h-4 w-4" />
                              Connect YouTube
                            </Button>
                          )}
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('youtube-upload')?.click()}
                            disabled={isUploading || !youtubeAuthenticated}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading {progress}%
                              </>
                            ) : (
                              <>
                                <Youtube className="mr-2 h-4 w-4" />
                                Upload to YouTube
                              </>
                            )}
                          </Button>
                          <input
                            id="youtube-upload"
                            type="file"
                            accept="video/*"
                            onChange={handleUploadVideo}
                            className="hidden"
                          />
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = form.getValues('video_url');
                              if (url) {
                                const embedUrl = getYouTubeEmbedUrl(url);
                                form.setValue('video_url', embedUrl);
                                setVideoPreviewUrl(embedUrl);
                              }
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Convert to Embed
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    {videoPreviewUrl && (
                      <div className="mt-4 border rounded-md overflow-hidden">
                        {isYouTubeEmbed ? (
                          // YouTube embed iframe 
                          <div className="relative pt-[56.25%]">
                            <iframe 
                              className="absolute top-0 left-0 w-full h-full" 
                              src={videoPreviewUrl} 
                              title="Video Preview"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                            ></iframe>
                          </div>
                        ) : (
                          // Direct video player for Supabase-hosted videos
                          <VideoPlayer 
                            videoUrl={videoPreviewUrl}
                            title={form.getValues('title') || "Video Preview"}
                            className="w-full aspect-video"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Lesson
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
