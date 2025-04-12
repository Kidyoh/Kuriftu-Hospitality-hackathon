
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Award, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Course {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  difficulty_level: string;
  sequence_order: number;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  department: string | null;
  role: string;
  courses: Course[];
}

export default function LearningPath() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (profile) {
      fetchLearningPath();
      fetchUserProgress();
    }
  }, [profile]);

  const fetchLearningPath = async () => {
    if (!profile) return;
    
    try {
      setIsLoading(true);
      
      // First try to get a learning path specific to the user's role and department
      let { data: pathData, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('role', profile.role)
        .eq('department', profile.department)
        .single();
        
      // If no specific path found, try to get a generic one for the role
      if (error || !pathData) {
        const { data: genericPathData, error: genericError } = await supabase
          .from('learning_paths')
          .select('*')
          .eq('role', profile.role)
          .is('department', null)
          .single();
          
        if (genericError || !genericPathData) {
          // If still no path, show default trainee path
          const { data: defaultPathData, error: defaultError } = await supabase
            .from('learning_paths')
            .select('*')
            .eq('role', 'trainee')
            .is('department', null)
            .single();
            
          if (defaultError || !defaultPathData) {
            console.error('No learning path found:', defaultError);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Could not find a learning path for your role and department."
            });
            setIsLoading(false);
            return;
          }
          
          pathData = defaultPathData;
        } else {
          pathData = genericPathData;
        }
      }
      
      // Now fetch courses for this path
      const { data: pathCourses, error: coursesError } = await supabase
        .from('path_courses')
        .select(`
          course_id,
          sequence_order,
          courses:course_id (
            id,
            title,
            description,
            estimated_hours,
            difficulty_level
          )
        `)
        .eq('path_id', pathData.id)
        .order('sequence_order', { ascending: true });
        
      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load course information for your learning path."
        });
      }
      
      // Transform data structure
      const courses = pathCourses ? pathCourses.map(item => ({
        ...item.courses,
        sequence_order: item.sequence_order
      })) : [];
      
      setLearningPath({
        ...pathData,
        courses: courses as Course[]
      });
      
    } catch (error) {
      console.error('Unexpected error fetching learning path:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while loading your learning path."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('user_courses')
        .select('course_id, progress')
        .eq('user_id', profile.id);
        
      if (error) {
        console.error('Error fetching user progress:', error);
        return;
      }
      
      const progressMap: Record<string, number> = {};
      data?.forEach(item => {
        progressMap[item.course_id] = item.progress;
      });
      
      setUserProgress(progressMap);
      
    } catch (error) {
      console.error('Unexpected error fetching user progress:', error);
    }
  };

  const enrollInCourse = async (courseId: string) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: profile.id,
          course_id: courseId,
          progress: 0,
          started_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error enrolling in course:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to enroll in the course. Please try again."
        });
        return;
      }
      
      toast({
        title: "Enrolled!",
        description: "You've successfully enrolled in the course."
      });
      
      fetchUserProgress();
      
    } catch (error) {
      console.error('Unexpected error enrolling in course:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while enrolling in the course."
      });
    }
  };

  const getOverallProgress = () => {
    if (!learningPath?.courses?.length) return 0;
    
    let totalProgress = 0;
    learningPath.courses.forEach(course => {
      totalProgress += userProgress[course.id] || 0;
    });
    
    return Math.round(totalProgress / learningPath.courses.length);
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="ml-3 text-lg font-medium">Loading your learning path...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Learning Path</h1>
          <p className="text-muted-foreground mt-2">
            {learningPath ? 
              `Follow this curated learning path for your ${profile?.department || ''} ${profile?.role}` : 
              'No learning path has been assigned to you yet. Please contact your manager.'}
          </p>
        </div>
        {learningPath && (
          <div className="text-right">
            <p className="text-sm font-medium">Overall Progress</p>
            <div className="flex items-center mt-1">
              <Progress value={getOverallProgress()} className="h-2 w-32" />
              <p className="ml-2 text-sm font-medium">{getOverallProgress()}%</p>
            </div>
          </div>
        )}
      </div>

      {learningPath ? (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{learningPath.name}</CardTitle>
                  <CardDescription>{learningPath.description}</CardDescription>
                </div>
                <Award className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Department: {learningPath.department || 'All Departments'}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>
                    {learningPath.courses.reduce((sum, course) => sum + (course.estimated_hours || 0), 0)} estimated hours
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold tracking-tight mb-4">Course Schedule</h2>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6 pb-6">
              {learningPath.courses.map((course, index) => (
                <Card key={course.id} className="relative">
                  <div className="absolute top-4 left-4 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium">
                    {index + 1}
                  </div>
                  
                  <CardHeader className="pl-16">
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pl-16 pb-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2 flex-1">
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{course.estimated_hours || 'Unknown'} hours</span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            <span>Difficulty: {course.difficulty_level || 'Beginner'}</span>
                          </div>
                        </div>
                        
                        {userProgress[course.id] !== undefined && (
                          <div className="flex items-center space-x-2">
                            <Progress value={userProgress[course.id]} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{userProgress[course.id]}%</span>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant={userProgress[course.id] !== undefined ? "outline" : "default"}
                        onClick={() => enrollInCourse(course.id)}
                        className="ml-4"
                      >
                        {userProgress[course.id] !== undefined ? 
                          (userProgress[course.id] === 100 ? "Completed" : "Continue") : 
                          "Start Course"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No Learning Path Found</h3>
          <p className="text-center text-muted-foreground max-w-md mb-6">
            We couldn't find a learning path for your role and department. Please contact your manager
            or the learning and development team for assistance.
          </p>
          <Button onClick={fetchLearningPath}>Retry</Button>
        </Card>
      )}
    </div>
  );
}
