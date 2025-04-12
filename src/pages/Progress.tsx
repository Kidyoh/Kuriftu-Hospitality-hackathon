import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserProgressSummary, updateLessonProgress } from '@/utils/trackingUtils';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Clock, Award, BookOpen, PieChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

interface ProgressData {
  courses: CourseProgress[];
  quizStats: {
    total: number;
    passed: number;
    averageScore: number;
  };
  overallProgress: number;
}

interface CourseProgress {
  course_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  started_at: string | null;
  last_accessed: string;
  courses: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    difficulty_level: string;
  };
  lessonStats: {
    total: number;
    completed: number;
  };
}

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  order_index: number;
  progress?: number;
  completed?: boolean;
}

export default function Progress() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseLessons, setCourseLessons] = useState<Record<string, Lesson[]>>({});
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchUserProgress();
    }
  }, [profile?.id]);
  
  useEffect(() => {
    if (expandedCourse && !courseLessons[expandedCourse]) {
      fetchCourseLessons(expandedCourse);
    }
  }, [expandedCourse]);

  const fetchUserProgress = async () => {
    if (!profile?.id) return;
    
    try {
      setIsLoading(true);
      const result = await getUserProgressSummary(profile.id);
      
      if ('error' in result) {
        throw result.error;
      }
      
      setProgressData(result as ProgressData);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast({
        title: "Error",
        description: "Failed to load your progress data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCourseLessons = async (courseId: string) => {
    try {
      // Get all lessons for the course
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, title, course_id, order_index')
        .eq('course_id', courseId)
        .order('order_index');
      
      if (lessonsError) throw lessonsError;
      
      if (!profile?.id) return;
      
      // Get user's progress for these lessons
      const { data: userLessons, error: userLessonsError } = await supabase
        .from('user_lessons')
        .select('lesson_id, progress, completed')
        .eq('user_id', profile.id)
        .eq('course_id', courseId);
      
      if (userLessonsError) throw userLessonsError;
      
      // Combine the data
      const lessonsWithProgress = (lessons || []).map(lesson => {
        const userProgress = userLessons?.find(ul => ul.lesson_id === lesson.id);
        return {
          ...lesson,
          progress: userProgress?.progress || 0,
          completed: userProgress?.completed || false
        };
      });
      
      setCourseLessons(prev => ({
        ...prev,
        [courseId]: lessonsWithProgress
      }));
    } catch (error) {
      console.error('Error fetching course lessons:', error);
      toast({
        title: "Error",
        description: "Failed to load lesson data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleProgressUpdate = async (lessonId: string, courseId: string, progress: number) => {
    if (!profile?.id) return;
    
    try {
      setUpdatingLessonId(lessonId);
      
      const result = await updateLessonProgress(
        profile.id,
        lessonId,
        courseId,
        progress
      );
      
      if ('error' in result) {
        throw result.error;
      }
      
      // Update local state
      setCourseLessons(prev => ({
        ...prev,
        [courseId]: prev[courseId].map(lesson => 
          lesson.id === lessonId 
            ? { ...lesson, progress, completed: progress === 100 }
            : lesson
        )
      }));
      
      // Refresh overall progress data
      fetchUserProgress();
      
      toast({
        title: "Progress updated",
        description: progress === 100 
          ? "Lesson marked as completed!" 
          : `Progress updated to ${progress}%`,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update your progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingLessonId(null);
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const renderLoading = () => (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
  
  if (isLoading) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">My Progress</h1>
        {renderLoading()}
      </div>
    );
  }
  
  if (!progressData || progressData.courses.length === 0) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">My Progress</h1>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No courses started yet</h2>
            <p className="text-muted-foreground mb-6">
              Enroll in courses to start tracking your learning progress
            </p>
            <Button onClick={() => navigate('/courses')}>
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">My Progress</h1>
      <p className="text-muted-foreground mb-6">Track and update your learning progress</p>
      
      <div className="grid gap-6 mb-6 md:grid-cols-3">
        {/* Overall progress card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center my-4">
              {Math.round(progressData.overallProgress)}%
            </div>
            <Progress value={progressData.overallProgress} className="h-2 mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              Across {progressData.courses.length} course{progressData.courses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        {/* Quiz stats card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Quiz Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Score</span>
                <Badge variant="outline">
                  {progressData.quizStats.averageScore.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Quizzes Passed</span>
                <Badge>
                  {progressData.quizStats.passed} / {progressData.quizStats.total}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Completed courses card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Completed Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center my-4">
              {progressData.courses.filter(c => c.completed).length}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Out of {progressData.courses.length} enrolled course{progressData.courses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Course progress accordion */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
          <CardDescription>
            View and update your progress for each course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={expandedCourse || undefined}
            onValueChange={(value) => setExpandedCourse(value)}
          >
            {progressData.courses.map((course) => (
              <AccordionItem key={course.course_id} value={course.course_id}>
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex flex-col items-start text-left">
                    <div className="font-semibold">{course.courses.title}</div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <div className="flex items-center mr-4">
                        <Clock className="h-3 w-3 mr-1" />
                        Started: {formatDate(course.started_at)}
                      </div>
                      <div className="flex items-center">
                        {course.completed ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Progress value={course.progress} className="h-2 w-24 mr-2" />
                            {course.progress}%
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-4 pr-6 pb-4">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Lessons completed: {course.lessonStats.completed}/{course.lessonStats.total}</span>
                        <span>Last accessed: {formatDate(course.last_accessed)}</span>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="mb-2">
                      <h4 className="font-medium mb-2">Manage Lessons Progress</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag the slider to update your progress for individual lessons
                      </p>
                      
                      {!courseLessons[course.course_id] ? (
                        <div className="space-y-4 py-2">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : courseLessons[course.course_id].length === 0 ? (
                        <p className="text-sm text-muted-foreground">No lessons available for this course</p>
                      ) : (
                        <div className="space-y-4">
                          {courseLessons[course.course_id].map((lesson) => (
                            <div key={lesson.id} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm">
                                  {lesson.order_index + 1}. {lesson.title}
                                </span>
                                <div className="flex items-center">
                                  {lesson.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                  ) : lesson.progress > 0 ? (
                                    <Clock className="h-4 w-4 text-amber-500 mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-muted-foreground mr-2" />
                                  )}
                                  <span className="text-sm">{lesson.progress}%</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 pl-4">
                                <Slider
                                  value={[lesson.progress || 0]}
                                  max={100}
                                  step={10}
                                  disabled={updatingLessonId === lesson.id}
                                  onValueChange={(values) => {
                                    if (updatingLessonId) return;
                                    
                                    // Temporarily update UI immediately
                                    setCourseLessons(prev => ({
                                      ...prev,
                                      [course.course_id]: prev[course.course_id].map(l => 
                                        l.id === lesson.id 
                                          ? { ...l, progress: values[0] }
                                          : l
                                      )
                                    }));
                                  }}
                                  onValueCommit={(values) => {
                                    handleProgressUpdate(lesson.id, course.course_id, values[0]);
                                  }}
                                  className="flex-1"
                                />
                                
                                <Button
                                  variant={lesson.completed ? "outline" : "default"}
                                  size="sm"
                                  disabled={updatingLessonId === lesson.id}
                                  onClick={() => handleProgressUpdate(
                                    lesson.id, 
                                    course.course_id, 
                                    lesson.completed ? 0 : 100
                                  )}
                                >
                                  {lesson.completed ? "Mark Incomplete" : "Mark Complete"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/courses/${course.course_id}`)}
                      >
                        View Course
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
} 