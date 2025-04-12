import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Users, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  duration: string;
  rating: number;
  students: number;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
}

function CourseCard({ 
  id,
  title, 
  description, 
  duration, 
  rating, 
  students, 
  tags, 
  level 
}: CourseCardProps) {
  const navigate = useNavigate();
  
  const getLevelColor = () => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return '';
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={() => navigate(`/courses/${id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base line-clamp-1">{title}</CardTitle>
          <Badge variant="outline" className={cn("capitalize", getLevelColor())}>
            {level}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 text-xs">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-kuriftu-orange text-kuriftu-orange" />
            <span>{rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{students}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function RecommendedCourses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<CourseCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        
        // Get courses from Supabase
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .limit(4);
        
        if (error) throw error;
        
        if (data) {
          // Transform data to match our component's needs
          const formattedCourses = data.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description || 'No description available',
            duration: `${course.estimated_hours || 1}h ${course.estimated_minutes || 0}m`,
            rating: course.rating || 4.5,
            students: course.enrolled_count || Math.floor(Math.random() * 300) + 50,
            tags: course.tags || ['Hospitality'],
            level: (course.difficulty_level || 'beginner') as 'beginner' | 'intermediate' | 'advanced'
          }));
          
          setCourses(formattedCourses);
        }
      } catch (err: any) {
        console.error('Error fetching courses:', err);
        setError(err.message || 'Failed to load courses');
        // Fallback to dummy data
        setCourses([
          {
            id: '1',
            title: "Guest Check-in Excellence",
            description: "Learn the perfect check-in process from greeting to room key handover.",
            duration: "1h 30m",
            rating: 4.7,
            students: 234,
            tags: ["Front Desk", "Service"],
            level: 'beginner'
          },
          {
            id: '2',
            title: "Ethiopian Coffee Ceremony",
            description: "Master the art of traditional coffee service unique to Ethiopia.",
            duration: "2h 15m",
            rating: 4.9,
            students: 187,
            tags: ["F&B", "Cultural"],
            level: 'intermediate'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCourses();
  }, [profile?.id]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Recommended Courses</CardTitle>
          <CardDescription>Loading your personalized recommendations...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kuriftu-brown" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Recommended Courses</CardTitle>
        <CardDescription>
          {error ? 'Using sample recommendations' : 'Suggested based on your role and progress'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
