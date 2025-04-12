import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, MoreHorizontal, Edit, Trash2, Video, MoveUp, MoveDown, Book
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  video_url: string | null;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: string;
  title: string;
}

export default function AdminCourseLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Partial<Lesson>>({
    title: '',
    description: '',
    video_url: '',
    sequence_order: 0,
  });
  
  useEffect(() => {
    if (profile && profile.role === 'admin' && courseId) {
      loadCourseDetails();
      loadLessons();
    } else {
      navigate('/dashboard');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
    }
  }, [profile, navigate, courseId]);
  
  const loadCourseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();
        
      if (error) {
        throw error;
      }
      
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast({
        title: "Error",
        description: "Failed to load course details.",
        variant: "destructive"
      });
    }
  };
  
  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast({
        title: "Error",
        description: "Failed to load lessons. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setCurrentLesson({
      title: '',
      description: '',
      video_url: '',
      sequence_order: lessons.length,
    });
  };
  
  const handleEditLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setIsEditing(true);
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentLesson.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a lesson title.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let result;
      
      if (isEditing && currentLesson.id) {
        result = await supabase
          .from('course_lessons')
          .update({
            title: currentLesson.title,
            description: currentLesson.description,
            video_url: currentLesson.video_url,
            sequence_order: currentLesson.sequence_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentLesson.id)
          .select();
          
        toast({
          title: "Lesson Updated",
          description: "The lesson has been successfully updated."
        });
      } else {
        result = await supabase
          .from('course_lessons')
          .insert({
            title: currentLesson.title,
            description: currentLesson.description,
            video_url: currentLesson.video_url,
            sequence_order: currentLesson.sequence_order || lessons.length,
            course_id: courseId
          })
          .select();
          
        toast({
          title: "Lesson Created",
          description: "A new lesson has been successfully created."
        });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      loadLessons();
      handleDialogClose();
      
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        title: "Error",
        description: "Failed to save lesson. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteLesson = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this lesson? This action cannot be undone.");
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Lesson Deleted",
        description: "The lesson has been successfully deleted."
      });
      
      loadLessons();
      
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Error",
        description: "Failed to delete lesson.",
        variant: "destructive"
      });
    }
  };
  
  const moveLesson = async (lesson: Lesson, direction: 'up' | 'down') => {
    const currentIndex = lessons.findIndex(l => l.id === lesson.id);
    let targetIndex;
    
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < lessons.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      return;
    }
    
    const targetLesson = lessons[targetIndex];
    
    try {
      const updates = [
        {
          id: lesson.id,
          sequence_order: targetLesson.sequence_order
        },
        {
          id: targetLesson.id,
          sequence_order: lesson.sequence_order
        }
      ];
      
      for (const update of updates) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ sequence_order: update.sequence_order })
          .eq('id', update.id);
          
        if (error) {
          throw error;
        }
      }
      
      toast({
        title: "Order Updated",
        description: "The lesson order has been updated."
      });
      
      loadLessons();
      
    } catch (error) {
      console.error('Error updating lesson order:', error);
      toast({
        title: "Error",
        description: "Failed to update lesson order.",
        variant: "destructive"
      });
    }
  };
  
  const goToQuizzes = (lessonId: string) => {
    navigate(`/admin/courses/${courseId}/lessons/${lessonId}/quizzes`);
  };

  return (
    <div className="container py-8">
      <Button 
        variant="outline" 
        onClick={() => navigate('/admin/courses')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
      </Button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {course ? `Course: ${course.title}` : 'Lessons Management'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage lessons for this course
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Lesson" : "Create New Lesson"}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Update the lesson details below."
                  : "Fill in the details below to create a new lesson."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="title" className="text-right">
                    Lesson Title*
                  </label>
                  <Input
                    id="title"
                    value={currentLesson.title || ''}
                    onChange={(e) => setCurrentLesson({...currentLesson, title: e.target.value})}
                    className="col-span-3"
                    placeholder="Introduction to the Topic"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={currentLesson.description || ''}
                    onChange={(e) => setCurrentLesson({...currentLesson, description: e.target.value})}
                    className="col-span-3"
                    placeholder="What this lesson covers..."
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="video_url" className="text-right">
                    Video URL
                  </label>
                  <Input
                    id="video_url"
                    value={currentLesson.video_url || ''}
                    onChange={(e) => setCurrentLesson({...currentLesson, video_url: e.target.value})}
                    className="col-span-3"
                    placeholder="https://example.com/video.mp4"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="sequence_order" className="text-right">
                    Sequence Order
                  </label>
                  <Input
                    id="sequence_order"
                    type="number"
                    value={currentLesson.sequence_order?.toString() || '0'}
                    onChange={(e) => setCurrentLesson({
                      ...currentLesson, 
                      sequence_order: parseInt(e.target.value) || 0
                    })}
                    className="col-span-3"
                    min="0"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Save Changes' : 'Create Lesson'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.length > 0 ? (
                  lessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell>{lesson.sequence_order}</TableCell>
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell>
                        {lesson.description ? (
                          lesson.description.length > 50 
                            ? `${lesson.description.substring(0, 50)}...` 
                            : lesson.description
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {lesson.video_url ? (
                          <a 
                            href={lesson.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <Video className="h-4 w-4 mr-1" /> View
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditLesson(lesson)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lesson
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => goToQuizzes(lesson.id)}>
                              <Book className="h-4 w-4 mr-2" />
                              Manage Quizzes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => moveLesson(lesson, 'up')}
                              disabled={lessons.indexOf(lesson) === 0}
                            >
                              <MoveUp className="h-4 w-4 mr-2" />
                              Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => moveLesson(lesson, 'down')}
                              disabled={lessons.indexOf(lesson) === lessons.length - 1}
                            >
                              <MoveDown className="h-4 w-4 mr-2" />
                              Move Down
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lesson
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No lessons found for this course. Click 'Add Lesson' to create your first lesson.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
