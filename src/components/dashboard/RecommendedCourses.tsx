
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Users } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CourseCardProps {
  title: string;
  description: string;
  duration: string;
  rating: number;
  students: number;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
}

function CourseCard({ 
  title, 
  description, 
  duration, 
  rating, 
  students, 
  tags, 
  level 
}: CourseCardProps) {
  const getLevelColor = () => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return '';
    }
  };

  return (
    <Card className="cursor-pointer transition-all hover:shadow-md">
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
  const courses = [
    {
      title: "Guest Check-in Excellence",
      description: "Learn the perfect check-in process from greeting to room key handover.",
      duration: "1h 30m",
      rating: 4.7,
      students: 234,
      tags: ["Front Desk", "Service"],
      level: 'beginner' as const
    },
    {
      title: "Ethiopian Coffee Ceremony",
      description: "Master the art of traditional coffee service unique to Ethiopia.",
      duration: "2h 15m",
      rating: 4.9,
      students: 187,
      tags: ["F&B", "Cultural"],
      level: 'intermediate' as const
    },
    {
      title: "Luxury Room Turndown",
      description: "Enhance guest experience with perfect turndown service techniques.",
      duration: "45m",
      rating: 4.5,
      students: 312,
      tags: ["Housekeeping", "Luxury"],
      level: 'beginner' as const
    },
    {
      title: "Resort Maintenance Basics",
      description: "Essential maintenance skills for all staff to ensure guest safety and comfort.",
      duration: "3h",
      rating: 4.3,
      students: 156,
      tags: ["Maintenance", "Safety"],
      level: 'intermediate' as const
    }
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Recommended Courses</CardTitle>
        <CardDescription>
          Suggested based on your role and progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.title} {...course} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
