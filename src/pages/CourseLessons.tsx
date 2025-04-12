
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Check, BookOpen, Video, 
  ChevronRight, PlusCircle, Edit, Trash, ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { VideoPlayer } from '@/components/lessons/VideoPlayer';
import { LessonEditor } from '@/components/lessons/LessonEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  sequence_order: number | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  passing_score: number | null;
  time_limit: number | null;
}

interface UserCourse {
  progress: number;
  completed: boolean;
}

export default function CourseLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userCourse, setUserCourse] = useState<UserCourse | null>(null);
  const { profile } = useAuth();
  
  // Admin editing states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | undefined>();
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [courseId, profile]);
  
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch course details
      if (courseId) {
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
        
        if (lessonData && lessonData.length > 0) {
          setSelectedLesson(lessonData[0]);
        }
        
        // Fetch quizzes
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('course_id', courseId);
          
        if (quizError) throw quizError;
        setQuizzes(quizData || []);
        
        // Fetch user's course progress if not admin
        if (profile && !isAdminPage) {
          const { data: userCourseData, error: userCourseError } = await supabase
            .from('user_courses')
            .select('progress, completed')
            .eq('user_id', profile.id)
            .eq('course_id', courseId)
            .single();
            
          if (!userCourseError) {
            setUserCourse(userCourseData);
          }
          
          // If no user_course entry exists, create one
          if (!userCourseData && !userCourseError.message.includes('No rows found')) {
            await supabase.from('user_courses').insert({
              user_id: profile.id,
              course_id: courseId,
              progress: 0,
              completed: false
            });
            
            setUserCourse({ progress: 0, completed: false });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateProgress = async (lessonIndex: number) => {
    if (!profile || !courseId || !lessons.length || isAdminPage) return;
    
    const progress = Math.round((lessonIndex + 1) / lessons.length * 100);
    
    try {
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: profile.id,
          course_id: courseId,
          progress: progress,
          completed: progress === 100
        });
        
      if (error) throw error;
      
      setUserCourse({ 
        progress: progress, 
        completed: progress === 100 
      });
      
      if (progress === 100) {
        toast({
          title: "Congratulations!",
          description: "You've completed this course!",
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };
  
  const handleSelectLesson = (lesson: Lesson, index: number) => {
    setSelectedLesson(lesson);
    updateProgress(index);
  };
  
  const handleNavigateLesson = (direction: 'prev' | 'next') => {
    if (!selectedLesson || !lessons.length) return;
    
    const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(lessons.length - 1, currentIndex + 1);
    }
    
    setSelectedLesson(lessons[newIndex]);
    updateProgress(newIndex);
  };
  
  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;
    
    try {
      const { error } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', lessonToDelete);
        
      if (error) throw error;
      
      toast({
        title: "Lesson deleted",
        description: "The lesson has been successfully deleted.",
      });
      
      // Refresh lessons data
      fetchData();
      // Reset the selected lesson if it was deleted
      if (selectedLesson && selectedLesson.id === lessonToDelete) {
        setSelectedLesson(null);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Error",
        description: "Failed to delete the lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLessonToDelete(null);
    }
  };
  
  const handleAddLesson = () => {
    setEditingLessonId(undefined);
    setIsEditorOpen(true);
  };
  
  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setIsEditorOpen(true);
  };
  
  const handleVideoCompletion = (lessonIndex: number) => {
    // Mark lesson as completed
    updateProgress(lessonIndex);
    
    // Automatically move to the next lesson if available
    if (lessonIndex < lessons.length - 1) {
      setTimeout(() => {
        handleNavigateLesson('next');
      }, 1000); // Small delay before auto-navigation
    }
  };
  
  const backPath = isAdminPage ? '/admin/courses' : '/courses';
  
  return (
    <div className="container py-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate(backPath)} 
        className="mb-4"
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Courses
      </Button>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-1">
              <Skeleton className="h-96" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-96" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">{course?.title}</h1>
              
              {isAdminPage && (
                <Button onClick={handleAddLesson} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add Lesson
                </Button>
              )}
            </div>
            
            <p className="text-muted-foreground mt-2">{course?.description}</p>
            
            {userCourse && !isAdminPage && (
              <div className="flex items-center mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${userCourse.progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{userCourse.progress}% Complete</span>
                
                {userCourse.completed && (
                  <Badge className="ml-2 bg-green-100 text-green-800">
                    <Check className="mr-1 h-3 w-3" /> Completed
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar with lesson list */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Course Content</CardTitle>
                  <CardDescription>
                    {lessons.length} lessons • {quizzes.length} quizzes
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                  {lessons.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Lessons</h3>
                      {lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className={`p-2 rounded-md flex items-center cursor-pointer group ${
                            selectedLesson?.id === lesson.id 
                              ? 'bg-primary/10 border-l-4 border-primary' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleSelectLesson(lesson, index)}
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            {lesson.video_url ? (
                              <Video className="h-4 w-4 mr-2 flex-shrink-0" />
                            ) : (
                              <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                            )}
                            <span className="text-sm line-clamp-2">{index + 1}. {lesson.title}</span>
                          </div>
                          
                          {isAdminPage && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditLesson(lesson.id);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLessonToDelete(lesson.id);
                                }}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {quizzes.length > 0 && (
                        <>
                          <h3 className="text-sm font-medium text-muted-foreground mt-4">Quizzes</h3>
                          {quizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="p-2 rounded-md flex items-center cursor-pointer hover:bg-muted justify-between"
                              onClick={() => navigate(`/${isAdminPage ? 'admin' : 'courses'}/${courseId}/quizzes/${quiz.id}${isAdminPage ? '/questions' : ''}`)}
                            >
                              <div className="flex items-center">
                                <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">{quiz.title}</span>
                              </div>
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">
                        {isAdminPage 
                          ? "No lessons added yet. Click 'Add Lesson' to create the first lesson."
                          : "No lessons available for this course yet."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-2 space-y-6">
              {selectedLesson ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{selectedLesson.title}</CardTitle>
                    {isAdminPage && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-2"
                          onClick={() => handleEditLesson(selectedLesson.id)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit Lesson
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedLesson.video_url ? (
                      <VideoPlayer 
                        videoUrl={selectedLesson.video_url}
                        title={selectedLesson.title}
                        onComplete={() => {
                          const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
                          handleVideoCompletion(currentIndex);
                        }}
                        className="rounded-md overflow-hidden"
                      />
                    ) : (
                      <div className="flex items-center justify-center bg-muted h-56 rounded-md">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none">
                      <p>{selectedLesson.description || 'No description available for this lesson.'}</p>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={() => handleNavigateLesson('prev')}
                        disabled={lessons.indexOf(selectedLesson) === 0}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>
                      
                      <Button
                        onClick={() => handleNavigateLesson('next')}
                        disabled={lessons.indexOf(selectedLesson) === lessons.length - 1}
                      >
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center border rounded-lg p-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {lessons.length > 0 
                      ? "Select a lesson to start learning" 
                      : isAdminPage 
                        ? "Add your first lesson to this course" 
                        : "This course doesn't have any lessons yet"}
                  </p>
                  
                  {isAdminPage && lessons.length === 0 && (
                    <Button onClick={handleAddLesson} className="mt-4 gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Add First Lesson
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Lesson Editor Modal */}
      <LessonEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        lessonId={editingLessonId}
        courseId={courseId || ''}
        onSaved={fetchData}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!lessonToDelete} onOpenChange={() => setLessonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteLesson}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
