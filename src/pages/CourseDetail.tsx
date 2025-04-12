import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Clock, 
  Award, 
  Layers, 
  PlayCircle, 
  CheckCircle, 
  BarChart,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface Course {
  id: string;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  difficulty_level: string | null;
  created_at: string;
  status: string | null;
  category: string | null;
  related_skill: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  sequence_order: number | null;
  completed?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  completed?: boolean;
  score?: number | null;
}

interface UserCourse {
  progress: number;
  completed: boolean;
  last_accessed: string | null;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [userCourse, setUserCourse] = useState<UserCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  
  useEffect(() => {
    if (!courseId || !profile) return;
    
    const fetchCourseData = async () => {
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
        
        // Fetch lessons for this course
        const { data: lessonData, error: lessonError } = await supabase
          .from('course_lessons')
          .select('id, title, description, sequence_order')
          .eq('course_id', courseId)
          .order('sequence_order', { ascending: true });
          
        if (lessonError) throw lessonError;
        setLessons(lessonData || []);
        
        // Fetch quizzes for this course
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('id, title, description, passing_score')
          .eq('course_id', courseId);
          
        if (quizError) throw quizError;
        setQuizzes(quizData || []);
        
        // Fetch user's progress for this course
        const { data: userCourseData, error: userCourseError } = await supabase
          .from('user_courses')
          .select('progress, completed, last_accessed')
          .eq('user_id', profile.id)
          .eq('course_id', courseId)
          .single();
          
        if (!userCourseError) {
          setUserCourse(userCourseData);
        }
        
        // Fetch completed lessons
        const { data: userLessonsData, error: userLessonsError } = await supabase
          .from('user_lessons')
          .select('lesson_id')
          .eq('user_id', profile.id)
          .eq('completed', true);
          
        if (!userLessonsError && userLessonsData) {
          setCompletedLessons(userLessonsData.map(item => item.lesson_id));
        }
        
        // Fetch completed quizzes
        const { data: userQuizzesData, error: userQuizzesError } = await supabase
          .from('user_quiz_results')
          .select('quiz_id, score, passed')
          .eq('user_id', profile.id)
          .eq('passed', true);
          
        if (!userQuizzesError && userQuizzesData) {
          setCompletedQuizzes(userQuizzesData.map(item => item.quiz_id));
          
          // Append score to quizzes
          if (quizData) {
            const quizzesWithScore = quizData.map(quiz => {
              const result = userQuizzesData.find(r => r.quiz_id === quiz.id);
              return {
                ...quiz,
                completed: !!result,
                score: result?.score || null
              };
            });
            setQuizzes(quizzesWithScore);
          }
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
        toast({
          title: t('app.error'),
          description: t('error.failedToLoad'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourseData();
  }, [courseId, profile, t]);
  
  const startOrContinueCourse = async () => {
    if (!profile || !courseId) return;
    
    try {
      // If user hasn't started the course yet
      if (!userCourse) {
        await supabase.from('user_courses').insert({
          user_id: profile.id,
          course_id: courseId,
          progress: 0,
          completed: false,
          last_accessed: new Date().toISOString()
        });
      } else {
        // Update last_accessed time
        await supabase.from('user_courses').update({
          last_accessed: new Date().toISOString()
        }).eq('user_id', profile.id).eq('course_id', courseId);
      }
      
      // Navigate to the first lesson if there are lessons
      if (lessons.length > 0) {
        navigate(`/courses/${courseId}/lessons`);
      } else {
        toast({
          title: t('courses.noLessons'),
          description: t('courses.noLessonsDescription'),
        });
      }
    } catch (error) {
      console.error('Error starting course:', error);
      toast({
        title: t('app.error'),
        description: t('error.failedToStart'),
        variant: "destructive",
      });
    }
  };
  
  const getDifficultyColor = (level: string | null) => {
    if (!level) return "bg-gray-500/20 text-gray-500";
    
    switch(level.toLowerCase()) {
      case 'beginner':
        return "bg-green-500/20 text-green-500";
      case 'intermediate':
        return "bg-blue-500/20 text-blue-500";
      case 'advanced':
        return "bg-orange-500/20 text-orange-500";
      case 'expert':
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };
  
  // Function to mark a lesson as completed
  const markLessonCompleted = async (lessonId: string, isCompleted: boolean) => {
    if (!profile || !courseId) {
      toast({
        title: t('app.error'),
        description: t('error.loginRequired'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isCompleted) {
        // Mark lesson as completed
        const { data, error } = await supabase
          .from('user_lessons')
          .upsert({
            user_id: profile.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id, lesson_id' })
          .select();
          
        if (error) throw error;
        
        // Add to the completed lessons array
        if (!completedLessons.includes(lessonId)) {
          setCompletedLessons([...completedLessons, lessonId]);
        }
      } else {
        // Mark lesson as not completed
        const { error } = await supabase
          .from('user_lessons')
          .delete()
          .match({ user_id: profile.id, lesson_id: lessonId });
          
        if (error) throw error;
        
        // Remove from the completed lessons array
        setCompletedLessons(completedLessons.filter(id => id !== lessonId));
      }
      
      // Update overall course progress
      await updateCourseProgress();
      
      toast({
        title: isCompleted ? t('success.lessonCompleted') : t('courses.markAsIncomplete'),
        description: t('success.progressUpdated'),
      });
    } catch (error) {
      console.error('Error updating lesson status:', error);
      toast({
        title: t('app.error'),
        description: t('error.failedToUpdate'),
        variant: "destructive",
      });
    }
  };

  // Function to calculate and update overall course progress
  const updateCourseProgress = async () => {
    if (!profile || !courseId) return;
    
    try {
      // Calculate percentage based on completed lessons and quizzes
      const totalItems = lessons.length + quizzes.length;
      if (totalItems === 0) return; // Avoid division by zero
      
      const completedItems = completedLessons.length + completedQuizzes.length;
      const progress = Math.round((completedItems / totalItems) * 100);
      
      // Update user_courses record
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: profile.id,
          course_id: courseId,
          progress: progress,
          completed: progress === 100,
          last_accessed: new Date().toISOString()
        }, { onConflict: 'user_id, course_id' });
        
      if (error) throw error;
      
      // Update local state
      setUserCourse(prev => ({
        ...prev || { completed: false, last_accessed: null },
        progress: progress,
        completed: progress === 100,
        last_accessed: new Date().toISOString()
      }));
      
      if (progress === 100 && (!userCourse || userCourse.progress !== 100)) {
        toast({
          title: t('app.success'),
          description: t('success.courseCompleted'),
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error updating course progress:', error);
      toast({
        title: t('app.error'),
        description: t('error.failedToUpdate'),
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">{t('courses.notFound')}</h3>
          <p className="mt-1 text-muted-foreground">{t('courses.notFoundDescription')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/courses')}>
            {t('courses.backToCourses')}
          </Button>
        </div>
      </div>
    );
  }
  
  const isEnrolled = !!userCourse;
  const isCompleted = userCourse?.completed || false;
  
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button 
              className="text-muted-foreground hover:text-foreground" 
              onClick={() => navigate('/courses')}
            >
              {t('courses.title')}
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium truncate">{course.title}</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            
            <div className="flex items-center gap-2">
              {course.difficulty_level && (
                <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
                  {course.difficulty_level}
                </Badge>
              )}
              
              {course.category && (
                <Badge variant="secondary">
                  {course.category}
                </Badge>
              )}
            </div>
          </div>
          
          {course.description && (
            <div className="prose dark:prose-invert max-w-none mb-8">
              <p>{course.description}</p>
            </div>
          )}
          
          {/* Course stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <Layers className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.lessons')}</span>
              <span className="text-2xl font-bold">{lessons.length}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <Award className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.quizzes')}</span>
              <span className="text-2xl font-bold">{quizzes.length}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <Clock className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.difficulty')}</span>
              <span className="text-2xl font-bold">{course.estimated_hours || 'N/A'} {t('courses.hours')}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <BarChart className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.progress')}</span>
              <span className="text-2xl font-bold">{userCourse?.progress || 0}%</span>
            </div>
          </div>
          
          {/* Tabs for lessons and quizzes */}
          <Tabs defaultValue="lessons" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="lessons">{t('courses.lessons')}</TabsTrigger>
              <TabsTrigger value="quizzes">{t('courses.quizzes')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lessons">
              {lessons.length > 0 ? (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    
                    return (
                      <Card key={lesson.id} className={isCompleted ? "border-green-200" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center">
                                <span className="mr-2">Lesson {index + 1}:</span> {lesson.title}
                              </CardTitle>
                              {lesson.description && (
                                <CardDescription className="mt-1">{lesson.description}</CardDescription>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`lesson-${lesson.id}`}
                                checked={isCompleted}
                                onCheckedChange={(checked) => markLessonCompleted(lesson.id, !!checked)}
                                className="data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
                              />
                              <label 
                                htmlFor={`lesson-${lesson.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {isCompleted ? t('courses.completed') : t('courses.markAsCompleted')}
                              </label>
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter className="flex justify-between">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/courses/${courseId}/lessons`)}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {isCompleted ? t('courses.review') : t('courses.continue')}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">{t('courses.noLessons')}</h3>
                  <p className="mt-1 text-muted-foreground">{t('courses.noLessonsDescription')}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="quizzes">
              {quizzes.length > 0 ? (
                <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const isCompleted = completedQuizzes.includes(quiz.id);
                    
                    return (
                      <Card key={quiz.id} className={isCompleted ? "border-green-200" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{quiz.title}</CardTitle>
                              {quiz.description && (
                                <CardDescription className="mt-1">{quiz.description}</CardDescription>
                              )}
                              {quiz.passing_score && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  Passing score: {quiz.passing_score}%
                                </div>
                              )}
                              {isCompleted && quiz.score !== null && (
                                <div className="mt-1 text-sm font-medium text-green-600">
                                  Your score: {quiz.score}%
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              {isCompleted ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 mb-2">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Passed
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full sm:w-auto"
                            onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}
                          >
                            {isCompleted ? t('courses.review') : t('courses.take')}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">{t('courses.noQuizzes')}</h3>
                  <p className="mt-1 text-muted-foreground">{t('courses.noQuizzesDescription')}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('courses.progress')}</CardTitle>
              <CardDescription>
                {isEnrolled 
                  ? "Track your learning journey" 
                  : "Start this course to track your progress"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEnrolled ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{t('courses.progress')}</span>
                      <span className="text-sm font-medium">{userCourse.progress}%</span>
                    </div>
                    <Progress value={userCourse.progress} className="h-2" />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('courses.lessons')} {t('courses.completed').toLowerCase()}</span>
                      <span className="font-medium">{completedLessons.length} / {lessons.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('courses.quizzes')} {t('quiz.passed').toLowerCase()}</span>
                      <span className="font-medium">{completedQuizzes.length} / {quizzes.length}</span>
                    </div>
                    
                    {userCourse.last_accessed && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Last accessed</span>
                        <span className="font-medium">{new Date(userCourse.last_accessed).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">Enroll in this course to start tracking your progress</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={isCompleted ? "outline" : "default"}
                onClick={startOrContinueCourse}
              >
                {!isEnrolled ? t('courses.enroll') : 
                  isCompleted ? t('courses.review') : t('courses.continue')}
              </Button>
            </CardFooter>
          </Card>
          
          {course.related_skill && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Related Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="mr-2">
                  {course.related_skill}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 