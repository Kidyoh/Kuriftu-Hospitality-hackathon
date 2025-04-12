import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface CourseProgressProps {
  id: string;
  title: string;
  progress: number;
  totalItems: number;
  completedItems: number;
}

function CourseProgress({ id, title, progress, totalItems, completedItems }: CourseProgressProps) {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <button 
          onClick={() => navigate(`/courses/${id}`)}
          className="hover:underline text-left truncate max-w-[80%]"
        >
          {title}
        </button>
        <span className="text-muted-foreground">{completedItems}/{totalItems}</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

export function ProgressSection() {
  const [courses, setCourses] = useState<CourseProgressProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserProgress() {
      if (!profile?.id) return;
      
      try {
        setIsLoading(true);
        
        // Get user's enrolled courses with progress
        const { data: userCourses, error: userCoursesError } = await supabase
          .from('user_courses')
          .select('course_id, progress, completed')
          .eq('user_id', profile.id)
          .order('last_accessed', { ascending: false })
          .limit(3);
        
        if (userCoursesError) throw userCoursesError;
        
        if (!userCourses || userCourses.length === 0) {
          setIsLoading(false);
          return;
        }
        
        // Get course details
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', userCourses.map(uc => uc.course_id || ''));
        
        if (coursesError) throw coursesError;
        
        // Get lessons and completed lessons for each course
        const courseProgressPromises = userCourses.map(async (userCourse) => {
          if (!userCourse.course_id) return null;
          
          // Get total lessons for the course
          const { data: lessons, error: lessonsError } = await supabase
            .from('course_lessons')
            .select('id')
            .eq('course_id', userCourse.course_id);
          
          if (lessonsError) throw lessonsError;
          
          // Get completed lessons for the course
          const lessonIds = lessons?.map(l => l.id) || [];
          let completedLessons: any[] = [];
          
          if (lessonIds.length > 0) {
            try {
              const { data, error } = await supabase.rpc('get_user_lessons', {
                p_user_id: profile.id,
                p_lesson_ids: lessonIds
              });
              
              if (!error && data) {
                completedLessons = data.filter((l: any) => l.completed);
              }
            } catch (e) {
              // Fallback if RPC function doesn't exist
              console.log('RPC function not available, using standard query');
              
              // Standard query with a custom type assertion
              const { data, error } = await supabase
                .from('user_lessons')
                .select('lesson_id')
                .eq('user_id', profile.id)
                .eq('completed', true)
                .in('lesson_id', lessonIds);
                
              if (!error) {
                completedLessons = data || [];
              }
            }
          }
          
          // Get quizzes for the course
          const { data: quizzes, error: quizzesError } = await supabase
            .from('quizzes')
            .select('id')
            .eq('course_id', userCourse.course_id);
          
          if (quizzesError) throw quizzesError;
          
          // Get completed quizzes for the course
          const quizIds = quizzes?.map(q => q.id) || [];
          let completedQuizzes: any[] = [];
          
          if (quizIds.length > 0) {
            try {
              const { data, error } = await supabase.rpc('get_user_quiz_results', {
                p_user_id: profile.id,
                p_quiz_ids: quizIds
              });
              
              if (!error && data) {
                completedQuizzes = data.filter((q: any) => q.passed);
              }
            } catch (e) {
              // Fallback if RPC function doesn't exist
              console.log('RPC function not available, using standard query');
              
              // Use a type assertion for this query
              const { data, error } = await supabase
                .from('user_quiz_results')
                .select('quiz_id')
                .eq('user_id', profile.id)
                .eq('passed', true)
                .in('quiz_id', quizIds);
                
              if (!error) {
                completedQuizzes = data || [];
              }
            }
          }
          
          const totalItems = (lessons?.length || 0) + (quizzes?.length || 0);
          const completedItems = (completedLessons?.length || 0) + (completedQuizzes?.length || 0);
          
          const course = coursesData?.find(c => c.id === userCourse.course_id);
          
          if (!course) return null;
          
          return {
            id: userCourse.course_id,
            title: course.title,
            progress: userCourse.progress || 0,
            totalItems,
            completedItems
          };
        });
        
        const progressResults = await Promise.all(courseProgressPromises);
        const validProgress = progressResults.filter(Boolean) as CourseProgressProps[];
        
        setCourses(validProgress);
      } catch (error) {
        console.error("Error fetching user progress:", error);
        setError("Failed to load your progress");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserProgress();
  }, [profile?.id]);

  const overallProgress = courses.length > 0
    ? Math.round(
        courses.reduce((sum, course) => sum + course.progress, 0) / courses.length
      )
    : 0;

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>Your learning journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Your Progress</CardTitle>
        <CardDescription>Your current learning journey</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : courses.length > 0 ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Overall Completion</span>
                <span className="text-sm font-semibold text-primary">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
            
            <div className="space-y-4">
              {courses.map((course) => (
                <CourseProgress key={course.id} {...course} />
              ))}
            </div>
            
            {courses.length < 3 && (
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => navigate('/courses')}
                >
                  Explore More Courses
                  <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">Start learning to track your progress</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
              Browse Courses
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
