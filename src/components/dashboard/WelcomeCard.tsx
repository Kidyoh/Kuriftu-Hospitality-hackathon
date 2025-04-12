
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface WelcomeCardProps {
  name?: string;
  role?: string;
}

interface UserCourse {
  course_id: string;
  progress: number;
  title: string;
}

export function WelcomeCard({ name = "Team Member", role = "Hotel Staff" }: WelcomeCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [inProgressCourse, setInProgressCourse] = useState<UserCourse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (profile) {
      fetchInProgressCourse();
    }
  }, [profile]);
  
  const timeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };
  
  const fetchInProgressCourse = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_courses')
        .select(`
          course_id,
          progress,
          courses:course_id (
            title
          )
        `)
        .eq('user_id', profile.id)
        .eq('completed', false)
        .order('progress', { ascending: false })
        .limit(1);
        
      if (!error && data && data.length > 0) {
        setInProgressCourse({
          course_id: data[0].course_id,
          progress: data[0].progress,
          title: data[0].courses.title
        });
      }
    } catch (error) {
      console.error('Error fetching in-progress course:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleContinueLearning = () => {
    if (inProgressCourse) {
      navigate(`/courses/${inProgressCourse.course_id}/lessons`);
    } else {
      navigate('/courses');
    }
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
            {inProgressCourse 
              ? `Continue your learning journey with "${inProgressCourse.title}". You're ${inProgressCourse.progress}% of the way there!`
              : "Continue your learning journey and build excellence in hospitality."}
          </p>
          <div className="flex space-x-2">
            <Button className="gap-2" onClick={handleContinueLearning} disabled={isLoading}>
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  {inProgressCourse ? 'Continue Learning' : 'Start Learning'}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/my-learning')}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Path
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
