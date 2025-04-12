
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Check, BookOpen, Video, Clock, 
  ChevronRight, Play
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userCourse, setUserCourse] = useState<UserCourse | null>(null);
  const { profile } = useAuth();
  
  useEffect(() => {
    async function fetchData() {
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
          
          // Fetch user's course progress
          if (profile) {
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
    }
    
    fetchData();
  }, [courseId, profile]);
  
  const updateProgress = async (lessonIndex: number) => {
    if (!profile || !courseId || !lessons.length) return;
    
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
  
  return (
    <div className="container py-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/courses')} 
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
            <h1 className="text-3xl font-bold">{course?.title}</h1>
            <p className="text-muted-foreground mt-2">{course?.description}</p>
            
            {userCourse && (
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
                          className={`p-2 rounded-md flex items-center cursor-pointer ${
                            selectedLesson?.id === lesson.id 
                              ? 'bg-primary/10 border-l-4 border-primary' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleSelectLesson(lesson, index)}
                        >
                          {lesson.video_url ? (
                            <Video className="h-4 w-4 mr-2 flex-shrink-0" />
                          ) : (
                            <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                          )}
                          <span className="text-sm line-clamp-2">{index + 1}. {lesson.title}</span>
                        </div>
                      ))}
                      
                      {quizzes.length > 0 && (
                        <>
                          <h3 className="text-sm font-medium text-muted-foreground mt-4">Quizzes</h3>
                          {quizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="p-2 rounded-md flex items-center cursor-pointer hover:bg-muted"
                              onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}
                            >
                              <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{quiz.title}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">No lessons available</p>
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
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedLesson.video_url ? (
                      <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                        {/* Video player would go here */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button size="lg" className="rounded-full h-16 w-16">
                            <Play className="h-8 w-8" />
                          </Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                          <h3 className="font-medium">{selectedLesson.title}</h3>
                        </div>
                      </div>
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
                  <p className="text-muted-foreground">Select a lesson to start learning</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
