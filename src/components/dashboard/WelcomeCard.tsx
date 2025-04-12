import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Award, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface WelcomeCardProps {
  name?: string;
  role?: string;
}

export function WelcomeCard({ name = "Team Member", role = "Hotel Staff" }: WelcomeCardProps) {
  const [recentCourse, setRecentCourse] = useState<{ id: string; title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchRecentActivity() {
      if (!profile?.id) return;
      
      try {
        setIsLoading(true);
        
        // Try to get the most recently accessed course
        // First check if our table has the last_accessed column
        try {
          // Try stored procedure first
          const { data: recentCourse, error: rpcError } = await supabase.rpc('get_user_recent_course', {
            p_user_id: profile.id
          });
          
          if (!rpcError && recentCourse) {
            setRecentCourse({
              id: recentCourse.id,
              title: recentCourse.title
            });
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.log("RPC not available, using direct query");
        }
        
        // Check if last_accessed column exists in the user_courses table
        let hasLastAccessed = false;
        
        try {
          // Get one record to check columns
          const { data: sampleUserCourse } = await supabase
            .from('user_courses')
            .select('*')
            .limit(1)
            .single();
            
          hasLastAccessed = sampleUserCourse && 'last_accessed' in sampleUserCourse;
        } catch (e) {
          console.log("Error checking table structure:", e);
        }
        
        // Query based on column existence
        let userCourses;
        if (hasLastAccessed) {
          const { data, error } = await supabase
            .from('user_courses')
            .select('course_id')
            .eq('user_id', profile.id)
            .order('last_accessed', { ascending: false })
            .limit(1);
            
          if (error) throw error;
          userCourses = data;
        } else {
          // Fallback to just get any course the user is enrolled in
          const { data, error } = await supabase
            .from('user_courses')
            .select('course_id')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) throw error;
          userCourses = data;
        }
        
        if (userCourses && userCourses.length > 0) {
          const recentCourseId = userCourses[0].course_id;
          
          // Get the course details
          const { data: courseData, error: courseDetailError } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', recentCourseId)
            .single();
            
          if (!courseDetailError && courseData) {
            setRecentCourse({
              id: courseData.id,
              title: courseData.title
            });
          }
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRecentActivity();
  }, [profile?.id]);

  const timeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };

  return (
    <Card className="w-full overflow-hidden border-none shadow-md">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80 z-10"></div>
        <div className="h-16 bg-kuriftu-sand pattern-bg opacity-50"></div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl">Good {timeOfDay()}, {name}!</CardTitle>
        <CardDescription>{role} - Kuriftu Resort</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground">
            {recentCourse 
              ? `Continue your progress in "${recentCourse.title}"`
              : "Start your learning journey and build excellence in hospitality."
            }
          </p>
          <div className="flex flex-wrap gap-2">
            {recentCourse ? (
              <Button 
                className="gap-2"
                onClick={() => navigate(`/courses/${recentCourse.id}`)}
              >
                <PlayCircle className="h-4 w-4" />
                Continue Learning
              </Button>
            ) : (
              <Button 
                className="gap-2"
                onClick={() => navigate('/courses')}
              >
                <BookOpen className="h-4 w-4" />
                Browse Courses
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => navigate('/my-learning')}
            >
              View Learning Path
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => navigate('/achievements')}
              className="gap-2"
            >
              <Award className="h-4 w-4" />
              Achievements
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
