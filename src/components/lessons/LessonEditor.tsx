
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Save, VideoIcon, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  
  const form = useForm<z.infer<typeof lessonSchema>>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      video_url: "",
      sequence_order: 0,
    }
  });

  useEffect(() => {
    if (isOpen && lessonId) {
      loadLessonData(lessonId);
    } else if (isOpen) {
      // For new lessons, get the next sequence number
      getNextSequenceNumber();
    }
  }, [isOpen, lessonId]);

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
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        form.reset({
          title: data.title || "",
          description: data.description || "",
          video_url: data.video_url || "",
          sequence_order: data.sequence_order || 0,
        });
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load lesson data. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      // Create a storage folder for this course if it doesn't exist
      const folderPath = `courses/${courseId}/videos`;
      const filePath = `${folderPath}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      
      // Upload the file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('lesson_content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            setProgress(Math.round((progress.loaded / progress.total) * 100));
          },
        });
        
      if (error) throw error;
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('lesson_content')
        .getPublicUrl(filePath);
        
      if (publicUrlData.publicUrl) {
        form.setValue('video_url', publicUrlData.publicUrl);
        toast({
          title: "Video uploaded",
          description: "The video has been uploaded successfully."
        });
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was an error uploading your video. Please try again."
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
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{lessonId ? 'Edit' : 'Add'} Lesson</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter lesson title" {...field} />
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
                        placeholder="Enter lesson description" 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ''}
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
                    <FormLabel>Video URL</FormLabel>
                    <div className="space-y-2">
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
                              onClick={() => form.setValue('video_url', '')}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Clear URL</span>
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('video-upload')?.click()}
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
                              Upload Video
                            </>
                          )}
                        </Button>
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          onChange={handleUploadVideo}
                          className="hidden"
                        />
                        
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(field.value, '_blank')}
                          >
                            <VideoIcon className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                        )}
                      </div>
                    </div>
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
                      <Input type="number" min="0" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
