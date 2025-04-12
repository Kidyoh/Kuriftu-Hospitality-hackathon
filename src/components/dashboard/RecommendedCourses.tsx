import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Users, BookOpen } from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  difficulty_level: string;
  enrollments_count: number;
  category: string;
  related_skill: string;
}

function CourseCard({ 
  id,
  title, 
  description, 
  estimated_hours, 
  difficulty_level, 
  enrollments_count, 
  category,
  related_skill
}: CourseCardProps) {
  const navigate = useNavigate();
  
  const getLevelColor = () => {
    switch (difficulty_level?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return '';
    }
  };

  const tags = [category, related_skill].filter(Boolean);

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md flex flex-col h-full"
      onClick={() => navigate(`/courses/${id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base line-clamp-1">{title}</CardTitle>
          {difficulty_level && (
            <Badge variant="outline" className={cn("capitalize", getLevelColor())}>
              {difficulty_level}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2 text-xs">
          {description || "No description available"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => tag && (
            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{estimated_hours || 1}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{enrollments_count || 0}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function RecommendedCourses() {
  const [courses, setCourses] = useState<CourseCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRecommendedCourses() {
      try {
        setIsLoading(true);
        
        // First, check if the AI recommendations endpoint is available
        if (profile?.id) {
          try {
            // Get the assessment results if any
            try {
              // First check if user_assessments table exists
              const { data: assessmentData, error: assessmentError } = await supabase.rpc(
                'get_latest_user_assessment',
                { p_user_id: profile.id }
              );
                
              // If RPC doesn't exist, try the custom table approach
              if (assessmentError && assessmentError.message.includes("function \"get_latest_user_assessment\" does not exist")) {
                console.log("RPC not available, trying direct query");
                
                // Use type assertion here to bypass type checking for this custom table
                const { data, error } = await supabase.from('user_assessments' as any)
                  .select('*')
                  .eq('user_id', profile.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                  
                if (error) {
                  console.error('Assessment query error:', error);
                  throw error;
                }
                
                if (data?.results) {
                  // Try to get AI recommendations
                  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recommendations`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                      userProfile: {
                        department: profile.department || 'hospitality',
                        position: profile.position || 'staff',
                        experience_level: profile.experience_level || 'beginner'
                      },
                      assessmentResults: data.results
                    })
                  });
                  
                  if (response.ok) {
                    const recommendations = await response.json();
                    if (recommendations.recommendedCourses?.length > 0) {
                      // Get the titles from the recommendations
                      const recommendedTitles = recommendations.recommendedCourses.map(
                        (course: any) => course.title
                      );
                      
                      // Fetch the actual course data from the database
                      const { data: coursesData, error: coursesError } = await supabase
                        .from('courses')
                        .select('id, title, description, estimated_hours, difficulty_level, category, related_skill')
                        .in('title', recommendedTitles);
                      
                      if (coursesError) throw coursesError;
                      
                      if (coursesData && coursesData.length > 0) {
                        // Get enrollment counts - fix the group function error
                        const enrollmentCounts: Record<string, number> = {};
                        
                        // Get counts individually for each course
                        await Promise.all(coursesData.map(async (course) => {
                          const { count, error } = await supabase
                            .from('user_courses')
                            .select('*', { count: 'exact', head: true })
                            .eq('course_id', course.id);
                            
                          if (!error && count !== null) {
                            enrollmentCounts[course.id] = count;
                          }
                        }));
                        
                        // Add enrollment counts to course data
                        const coursesWithEnrollments = coursesData.map(course => ({
                          ...course,
                          enrollments_count: enrollmentCounts[course.id] || 0
                        }));
                        
                        setCourses(coursesWithEnrollments);
                        setIsLoading(false);
                        return;
                      }
                    }
                  }
                }
              } else if (!assessmentError && assessmentData) {
                // RPC call worked, process the data
                // Process assessment data from RPC
                if (assessmentData.results) {
                  // Try to get AI recommendations
                  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recommendations`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                      userProfile: {
                        department: profile.department || 'hospitality',
                        position: profile.position || 'staff',
                        experience_level: profile.experience_level || 'beginner'
                      },
                      assessmentResults: assessmentData.results
                    })
                  });
                  
                  if (response.ok) {
                    const recommendations = await response.json();
                    if (recommendations.recommendedCourses?.length > 0) {
                      // Process recommendations similar to above
                      const recommendedTitles = recommendations.recommendedCourses.map(
                        (course: any) => course.title
                      );
                      
                      const { data: coursesData, error: coursesError } = await supabase
                        .from('courses')
                        .select('id, title, description, estimated_hours, difficulty_level, category, related_skill')
                        .in('title', recommendedTitles);
                      
                      if (coursesError) throw coursesError;
                      
                      if (coursesData && coursesData.length > 0) {
                        const enrollmentCounts: Record<string, number> = {};
                        
                        await Promise.all(coursesData.map(async (course) => {
                          const { count, error } = await supabase
                            .from('user_courses')
                            .select('*', { count: 'exact', head: true })
                            .eq('course_id', course.id);
                            
                          if (!error && count !== null) {
                            enrollmentCounts[course.id] = count;
                          }
                        }));
                        
                        const coursesWithEnrollments = coursesData.map(course => ({
                          ...course,
                          enrollments_count: enrollmentCounts[course.id] || 0
                        }));
                        
                        setCourses(coursesWithEnrollments);
                        setIsLoading(false);
                        return;
                      }
                    }
                  }
                }
              }
            } catch (aiError) {
              console.error("Error fetching AI recommendations:", aiError);
              // Continue to fallback if AI recommendations fail
            }
          } catch (error) {
            console.error("Error fetching AI recommendations:", error);
            // Continue to fallback if AI recommendations fail
          }
        }
        
        // Fallback: Fetch trending or recent courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title, description, estimated_hours, difficulty_level, category, related_skill')
          .limit(4);
        
        if (coursesError) throw coursesError;
        
        if (coursesData && coursesData.length > 0) {
          // Get enrollment counts - fix the group function error
          const enrollmentCounts: Record<string, number> = {};
          
          // Get counts individually for each course
          await Promise.all(coursesData.map(async (course) => {
            const { count, error } = await supabase
              .from('user_courses')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);
              
            if (!error && count !== null) {
              enrollmentCounts[course.id] = count;
            }
          }));
          
          // Add enrollment counts to course data
          const coursesWithEnrollments = coursesData.map(course => ({
            ...course,
            enrollments_count: enrollmentCounts[course.id] || 0
          }));
          
          setCourses(coursesWithEnrollments);
        }
      } catch (error) {
        console.error("Error fetching recommended courses:", error);
        setError("Failed to load recommended courses");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRecommendedCourses();
  }, [profile?.id]);

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Recommended Courses</CardTitle>
          <CardDescription>
            Recommended for your role and skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/courses')}>Browse All Courses</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Recommended For You</CardTitle>
        <CardDescription>
          Courses tailored to your skills and interests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="h-44">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3 mt-1" />
                </CardHeader>
                <CardContent className="pb-2">
                  <Skeleton className="h-3 w-16" />
                </CardContent>
                <CardFooter>
                  <div className="flex justify-between w-full">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">No recommended courses yet</p>
            <Button onClick={() => navigate('/courses')}>Browse All Courses</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
