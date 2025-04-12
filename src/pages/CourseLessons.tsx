import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Check, BookOpen, Video, Clock, 
  ChevronRight, Play, Globe, CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/checkbox';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  sequence_order: number | null;
  content_en: string | null;
  content_am: string | null;
  content_or: string | null;
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
  const [language, setLanguage] = useState<'en' | 'am' | 'or'>('en');
  
  // Language names for display
  const languageNames = {
    en: 'English',
    am: 'አማርኛ',
    or: 'Oromiffa'
  };
  
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
  
  const updateProgress = async (lessonIndex: number, markCurrentAsCompleted = false) => {
    if (!profile || !courseId || !lessons.length) return;
    
    // Mark the current lesson as completed if requested
    if (markCurrentAsCompleted && selectedLesson) {
      try {
        await supabase.from('user_lessons').upsert({
          user_id: profile.id,
          lesson_id: selectedLesson.id,
          completed: true,
          completed_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error marking lesson as completed:', error);
      }
    }
    
    // Get all completed lessons for this course
    try {
      const { data: completedLessonsData } = await supabase
        .from('user_lessons')
        .select('lesson_id')
        .eq('user_id', profile.id)
        .eq('completed', true);
        
      const completedLessonIds = completedLessonsData?.map(item => item.lesson_id) || [];
      
      // Filter to only include lessons from this course
      const completedLessonsInThisCourse = lessons.filter(lesson => 
        completedLessonIds.includes(lesson.id)
      );
      
      // Calculate progress based on completed lessons
      const completedCount = completedLessonsInThisCourse.length;
      const progress = Math.round((completedCount / lessons.length) * 100);
      
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
  
  // Function to get content based on selected language
  const getLessonContent = (lesson: Lesson | null) => {
    if (!lesson) return null;
    
    switch (language) {
      case 'en':
        return lesson.content_en;
      case 'am':
        return lesson.content_am;
      case 'or':
        return lesson.content_or;
      default:
        return lesson.content_en;
    }
  };
  
  // Function to check if content is available in a specific language
  const isContentAvailable = (lesson: Lesson | null, lang: 'en' | 'am' | 'or') => {
    if (!lesson) return false;
    
    switch (lang) {
      case 'en':
        return !!lesson.content_en;
      case 'am':
        return !!lesson.content_am;
      case 'or':
        return !!lesson.content_or;
      default:
        return false;
    }
  };
  
  // Get available languages for the current lesson
  const getAvailableLanguages = (lesson: Lesson | null) => {
    if (!lesson) return [];
    
    const languages = [];
    if (lesson.content_en) languages.push('en');
    if (lesson.content_am) languages.push('am');
    if (lesson.content_or) languages.push('or');
    
    return languages;
  };
  
  // Add a new function to mark the current lesson as completed
  const markCurrentLessonCompleted = async () => {
    if (!selectedLesson) return;
    
    const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
    if (currentIndex === -1) return;
    
    await updateProgress(currentIndex, true);
    
    toast({
      title: "Lesson Completed",
      description: "Your progress has been updated",
    });
    
    // If there's a next lesson, navigate to it
    if (currentIndex < lessons.length - 1) {
      setSelectedLesson(lessons[currentIndex + 1]);
    }
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
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="md:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{course?.title}</h1>
            <p className="text-muted-foreground">{course?.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main lesson content */}
            <div className="md:col-span-2 space-y-6">
              {selectedLesson ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xl">{selectedLesson.title}</CardTitle>
                      <CardDescription>{selectedLesson.description}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Globe className="h-4 w-4" />
                          {languageNames[language]}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {getAvailableLanguages(selectedLesson).map((lang) => (
                          <DropdownMenuItem 
                            key={lang}
                            onClick={() => setLanguage(lang as 'en' | 'am' | 'or')}
                            className={language === lang ? 'bg-accent' : ''}
                          >
                            {languageNames[lang as keyof typeof languageNames]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    {selectedLesson.video_url && (
                      <div className="mb-6">
                        <div className="relative pb-[56.25%] overflow-hidden rounded-md">
                          <iframe 
                            className="absolute top-0 left-0 w-full h-full" 
                            src={selectedLesson.video_url} 
                            title={selectedLesson.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    )}
                    
                    {getLessonContent(selectedLesson) ? (
                      <div 
                        className="prose max-w-none" 
                        dir={language === 'en' ? 'ltr' : 'auto'}
                      >
                        {/* Render content with markdown/formatting if needed */}
                        <div className="whitespace-pre-line">
                          {getLessonContent(selectedLesson)}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground">
                          {isContentAvailable(selectedLesson, 'en') || 
                           isContentAvailable(selectedLesson, 'am') || 
                           isContentAvailable(selectedLesson, 'or') 
                            ? `Content not available in ${languageNames[language]}`
                            : 'No content available for this lesson'}
                        </p>
                        
                        {(isContentAvailable(selectedLesson, 'en') || 
                          isContentAvailable(selectedLesson, 'am') || 
                          isContentAvailable(selectedLesson, 'or')) && (
                          <div className="mt-4">
                            <p className="mb-2">Available in:</p>
                            <div className="flex gap-2 justify-center">
                              {getAvailableLanguages(selectedLesson).map((lang) => (
                                <Button 
                                  key={lang} 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLanguage(lang as 'en' | 'am' | 'or')}
                                >
                                  {languageNames[lang as keyof typeof languageNames]}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between mt-8 mb-4">
                    <Button 
                      onClick={markCurrentLessonCompleted}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleNavigateLesson('prev')}
                        disabled={lessons.findIndex(l => l.id === selectedLesson?.id) === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                      </Button>
                      <Button
                        onClick={() => handleNavigateLesson('next')}
                        disabled={lessons.findIndex(l => l.id === selectedLesson?.id) === lessons.length - 1}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center p-8">
                    <p className="text-muted-foreground">No lessons available</p>
                  </CardContent>
                </Card>
              )}
              
              {quizzes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Course Quizzes</CardTitle>
                    <CardDescription>Test your knowledge of the course material</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {quizzes.map(quiz => (
                        <div key={quiz.id} className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{quiz.title}</h4>
                            <p className="text-sm text-muted-foreground">{quiz.description}</p>
                            <div className="flex items-center mt-1 text-sm text-muted-foreground">
                              {quiz.time_limit && (
                                <span className="flex items-center mr-4">
                                  <Clock className="mr-1 h-3 w-3" /> 
                                  {quiz.time_limit} minutes
                                </span>
                              )}
                              {quiz.passing_score && (
                                <span className="flex items-center">
                                  <Check className="mr-1 h-3 w-3" /> 
                                  {quiz.passing_score}% to pass
                                </span>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}
                          >
                            Take Quiz
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Sidebar with lesson list */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Lessons</CardTitle>
                  {userCourse && (
                    <div className="mt-2">
                      <div className="text-sm text-muted-foreground">
                        Progress: {userCourse.progress}%
                      </div>
                      <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${userCourse.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {lessons.map((lesson, idx) => (
                      <Button
                        key={lesson.id}
                        variant={selectedLesson?.id === lesson.id ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSelectLesson(lesson, idx)}
                      >
                        <div className="flex items-start">
                          <div className="mr-2 mt-0.5">
                            {lesson.sequence_order}.
                          </div>
                          <div className="text-left">
                            <div className="font-medium truncate max-w-[200px]">{lesson.title}</div>
                            <div className="flex mt-1 space-x-1">
                              {lesson.video_url && (
                                <Badge variant="outline" className="text-xs">
                                  <Video className="h-3 w-3 mr-1" /> Video
                                </Badge>
                              )}
                              {lesson.content_en && (
                                <Badge variant="outline" className="text-xs">EN</Badge>
                              )}
                              {lesson.content_am && (
                                <Badge variant="outline" className="text-xs">አማ</Badge>
                              )}
                              {lesson.content_or && (
                                <Badge variant="outline" className="text-xs">Oro</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
