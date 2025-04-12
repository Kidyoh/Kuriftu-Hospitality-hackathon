import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, PlusCircle, Edit, Trash, GripVertical, Video, File, Save
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  sequence_order: number;
  course_id: string;
  created_at: string;
  content_en: string | null;
  content_am: string | null;
  content_or: string | null;
}

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  video_url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  sequence_order: z.coerce.number().min(1, "Sequence order is required"),
  content_en: z.string().optional(),
  content_am: z.string().optional(),
  content_or: z.string().optional()
});

export default function AdminCourseLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderedLessons, setReorderedLessons] = useState<Lesson[]>([]);
  const [activeLanguageTab, setActiveLanguageTab] = useState('english');
  
  const form = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      video_url: "",
      sequence_order: 1,
      content_en: "",
      content_am: "",
      content_or: ""
    }
  });
  
  useEffect(() => {
    if (!courseId) {
      navigate('/admin/courses');
      return;
    }
    
    fetchCourseAndLessons();
    // Check database schema for debugging
    checkDatabaseSchema();
  }, [courseId, navigate]);
  
  const fetchCourseAndLessons = async () => {
    setIsLoading(true);
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
        
      if (courseError) throw courseError;
      setCourse(courseData);
      
      // Fetch lessons
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true });
        
      if (lessonError) throw lessonError;
      setLessons(lessonData || []);
      setReorderedLessons(lessonData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch course data: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Temporary function to check schema
  const checkDatabaseSchema = async () => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .limit(1);
        
      if (error) throw error;
      
      console.log('Database schema sample:', data);
      console.log('Available columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data found');
    } catch (error) {
      console.error('Error checking schema:', error);
    }
  };
  
  const handleAddLesson = async (values: z.infer<typeof lessonSchema>) => {
    if (!courseId) return;
    
    try {
      const { error } = await supabase
        .from('course_lessons')
        .insert({
          course_id: courseId,
          title: values.title,
          description: values.description || null,
          video_url: values.video_url || null,
          sequence_order: values.sequence_order,
          content_en: values.content_en || null,
          content_am: values.content_am || null,
          content_or: values.content_or || null
        });
        
      if (error) throw error;
      
      toast({
        title: "Lesson added",
        description: "The lesson has been added successfully"
      });
      
      setIsAddingLesson(false);
      form.reset();
      fetchCourseAndLessons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add lesson: ${error.message}`
      });
    }
  };
  
  const handleEditLesson = async (values: z.infer<typeof lessonSchema>) => {
    if (!selectedLesson) return;
    
    try {
      const { error } = await supabase
        .from('course_lessons')
        .update({
          title: values.title,
          description: values.description || null,
          video_url: values.video_url || null,
          sequence_order: values.sequence_order,
          content_en: values.content_en || null,
          content_am: values.content_am || null,
          content_or: values.content_or || null
        })
        .eq('id', selectedLesson.id);
        
      if (error) throw error;
      
      toast({
        title: "Lesson updated",
        description: "The lesson has been updated successfully"
      });
      
      setIsEditing(false);
      setSelectedLesson(null);
      form.reset();
      fetchCourseAndLessons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update lesson: ${error.message}`
      });
    }
  };
  
  const handleDeleteLesson = (lessonId: string) => {
    setLessonToDelete(lessonId);
    setIsDeleting(true);
  };
  
  const confirmDelete = async () => {
    if (!lessonToDelete) return;
    
    try {
      const { error } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', lessonToDelete);
        
      if (error) throw error;
      
      toast({
        title: "Lesson deleted",
        description: "The lesson has been deleted successfully"
      });
      
      setIsDeleting(false);
      setLessonToDelete(null);
      fetchCourseAndLessons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete lesson: ${error.message}`
      });
    }
  };
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.classList.add('opacity-50');
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent');
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-accent');
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent');
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex === dropIndex) return;
    
    const items = [...reorderedLessons];
    const draggedItem = items[dragIndex];
    
    // Remove the dragged item
    items.splice(dragIndex, 1);
    
    // Insert it at the drop position
    items.splice(dropIndex, 0, draggedItem);
    
    // Update the sequence order
    const updatedItems = items.map((item, index) => ({
      ...item,
      sequence_order: index + 1
    }));
    
    setReorderedLessons(updatedItems);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };
  
  const saveReorderedLessons = async () => {
    try {
      // Update each lesson with its new sequence order
      const updates = reorderedLessons.map(lesson => ({
        id: lesson.id,
        sequence_order: lesson.sequence_order
      }));
      
      // Use a transaction to update all lessons
      for (const update of updates) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ sequence_order: update.sequence_order })
          .eq('id', update.id);
          
        if (error) throw error;
      }
      
      toast({
        title: "Lessons reordered",
        description: "The lesson order has been updated successfully"
      });
      
      setIsReordering(false);
      fetchCourseAndLessons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to reorder lessons: ${error.message}`
      });
    }
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/courses')} 
            className="mr-4"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Courses
          </Button>
          <h1 className="text-2xl font-bold">{isLoading ? 'Loading...' : course?.title}</h1>
        </div>
        
        <div className="flex gap-2">
          {isReordering ? (
            <>
              <Button onClick={() => setIsReordering(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={saveReorderedLessons} className="gap-2">
                <Save className="h-4 w-4" />
                Save Order
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsReordering(true)}
                className="gap-2"
              >
                <GripVertical className="h-4 w-4" />
                Reorder
              </Button>
              
              <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Lesson
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Lesson</DialogTitle>
                    <DialogDescription>
                      Create a new lesson for this course with content in multiple languages
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddLesson)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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
                          name="sequence_order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sequence Order</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  defaultValue={lessons.length + 1} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Brief description of this lesson..." {...field} />
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
                            <FormLabel>Video URL (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/video" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="border rounded-md p-4">
                        <h3 className="mb-4 font-medium">Lesson Content</h3>
                        <Tabs defaultValue="english" onValueChange={setActiveLanguageTab}>
                          <TabsList className="mb-4">
                            <TabsTrigger value="english">English</TabsTrigger>
                            <TabsTrigger value="amharic">Amharic</TabsTrigger>
                            <TabsTrigger value="oromiffa">Oromiffa</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="english">
                            <FormField
                              control={form.control}
                              name="content_en"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>English Content</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter lesson content in English..." 
                                      className="min-h-[200px]"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          
                          <TabsContent value="amharic">
                            <FormField
                              control={form.control}
                              name="content_am"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amharic Content</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter lesson content in Amharic..." 
                                      className="min-h-[200px]"
                                      dir="auto"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          
                          <TabsContent value="oromiffa">
                            <FormField
                              control={form.control}
                              name="content_or"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Oromiffa Content</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter lesson content in Oromiffa..." 
                                      className="min-h-[200px]"
                                      dir="auto"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                        </Tabs>
                      </div>
                      
                      <DialogFooter>
                        <Button type="submit">Add Lesson</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <p className="text-muted-foreground mb-4">No lessons found for this course.</p>
                <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Add First Lesson
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : isReordering ? (
            <div className="space-y-2">
              {reorderedLessons.map((lesson, index) => (
                <Card 
                  key={lesson.id}
                  className="cursor-move transition-all"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <CardHeader className="p-4 flex flex-row items-center">
                    <GripVertical className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{lesson.sequence_order}. {lesson.title}</CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            lessons.map((lesson) => (
              <Card key={lesson.id} className="w-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        <span className="text-primary mr-2">{lesson.sequence_order}.</span> 
                        {lesson.title}
                        {lesson.video_url && (
                          <Badge variant="secondary" className="ml-2 gap-1">
                            <Video className="h-3 w-3" /> Video
                          </Badge>
                        )}
                      </CardTitle>
                      {lesson.description && (
                        <CardDescription>{lesson.description}</CardDescription>
                      )}
                      <div className="flex mt-2 gap-1">
                        {lesson.content_en && (
                          <Badge variant="outline" className="text-xs">EN</Badge>
                        )}
                        {lesson.content_am && (
                          <Badge variant="outline" className="text-xs">አማርኛ</Badge>
                        )}
                        {lesson.content_or && (
                          <Badge variant="outline" className="text-xs">Oromiffa</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setIsEditing(true);
                          form.reset({
                            title: lesson.title,
                            description: lesson.description || "",
                            video_url: lesson.video_url || "",
                            sequence_order: lesson.sequence_order,
                            content_en: lesson.content_en || "",
                            content_am: lesson.content_am || "",
                            content_or: lesson.content_or || ""
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Edit Lesson Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>
              Modify the details of this lesson
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditLesson)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  name="sequence_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sequence Order</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of this lesson..." {...field} />
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
                    <FormLabel>Video URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/video" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border rounded-md p-4">
                <h3 className="mb-4 font-medium">Lesson Content</h3>
                <Tabs defaultValue="english" onValueChange={setActiveLanguageTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="english">English</TabsTrigger>
                    <TabsTrigger value="amharic">Amharic</TabsTrigger>
                    <TabsTrigger value="oromiffa">Oromiffa</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="english">
                    <FormField
                      control={form.control}
                      name="content_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>English Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter lesson content in English..." 
                              className="min-h-[200px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="amharic">
                    <FormField
                      control={form.control}
                      name="content_am"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amharic Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter lesson content in Amharic..." 
                              className="min-h-[200px]"
                              dir="auto"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="oromiffa">
                    <FormField
                      control={form.control}
                      name="content_or"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Oromiffa Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter lesson content in Oromiffa..." 
                              className="min-h-[200px]"
                              dir="auto"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleting(false);
                setLessonToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 