
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Filter, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  description: string;
  estimated_hours: number | null;
  difficulty_level: string | null;
  created_at: string;
  progress?: number;
  started_at?: string;
  completed?: boolean;
}

export default function Courses() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (profile) {
      loadCourses();
    }
  }, [profile]);
  
  const loadCourses = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        return;
      }
      
      // Fetch user's courses with progress
      const { data: userCoursesData, error: userCoursesError } = await supabase
        .from('user_courses')
        .select('*, course:course_id(*)')
        .eq('user_id', profile.id);
        
      if (userCoursesError) {
        console.error('Error fetching user courses:', userCoursesError);
      }
      
      setAllCourses(coursesData || []);
      
      // Transform user courses into the right format
      const transformedUserCourses = userCoursesData?.map(userCourse => ({
        ...userCourse.course,
        progress: userCourse.progress,
        started_at: userCourse.started_at,
        completed: userCourse.completed
      })) || [];
      
      setMyCourses(transformedUserCourses);
      
    } catch (error) {
      console.error('Unexpected error loading courses:', error);
    } finally {
      setIsLoading(false);
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
        return;
      }
      
      // Reload courses after enrollment
      loadCourses();
      
    } catch (error) {
      console.error('Unexpected error enrolling in course:', error);
    }
  };
  
  const isEnrolled = (courseId: string) => {
    return myCourses.some(course => course.id === courseId);
  };
  
  const filteredAllCourses = allCourses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const filteredMyCourses = myCourses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
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
  
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">Explore available courses or continue your enrolled courses</p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-10 w-full md:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="my">My Courses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredAllCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAllCourses.map(course => (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      {course.difficulty_level && (
                        <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
                          {course.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{course.estimated_hours || 'Unknown'} hours</span>
                    </div>
                    
                    {isEnrolled(course.id) && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Progress</span>
                          <span className="text-xs">{myCourses.find(c => c.id === course.id)?.progress || 0}%</span>
                        </div>
                        <Progress 
                          value={myCourses.find(c => c.id === course.id)?.progress || 0} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isEnrolled(course.id) ? "secondary" : "default"}
                      onClick={() => isEnrolled(course.id) ? 
                        navigate(`/courses/${course.id}`) : 
                        enrollInCourse(course.id)
                      }
                    >
                      {isEnrolled(course.id) ? "Continue Course" : "Enroll Now"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No courses found</h3>
              <p className="text-muted-foreground">{searchQuery ? 'Try a different search term' : 'No courses are available at the moment'}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredMyCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyCourses.map(course => (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      {course.difficulty_level && (
                        <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
                          {course.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{course.estimated_hours || 'Unknown'} hours</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">Progress</span>
                        <span className="text-xs">{course.progress || 0}%</span>
                      </div>
                      <Progress value={course.progress || 0} className="h-2" />
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={course.completed ? "outline" : "default"}
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      {course.completed ? "Review Course" : "Continue Learning"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No enrolled courses</h3>
              <p className="text-muted-foreground mb-6">{searchQuery ? 'Try a different search term' : "You haven't enrolled in any courses yet"}</p>
              <Button onClick={() => document.querySelector('button[value="all"]')?.click()}>
                Browse Courses
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
