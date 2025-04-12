
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CourseProgressProps {
  title: string;
  progress: number;
  totalItems: number;
  completedItems: number;
}

function CourseProgress({ title, progress, totalItems, completedItems }: CourseProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{title}</span>
        <span className="text-muted-foreground">{completedItems}/{totalItems}</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

export function ProgressSection() {
  const courses = [
    { 
      title: "Guest Service Excellence", 
      progress: 75, 
      totalItems: 10, 
      completedItems: 7 
    },
    { 
      title: "Ethiopian Hospitality Tradition", 
      progress: 40, 
      totalItems: 8, 
      completedItems: 3 
    },
    { 
      title: "Professional Communication", 
      progress: 90, 
      totalItems: 12, 
      completedItems: 11 
    }
  ];

  const overallProgress = Math.round(
    courses.reduce((sum, course) => sum + course.progress, 0) / courses.length
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Your Progress</CardTitle>
        <CardDescription>Your current learning journey</CardDescription>
      </CardHeader>
      <CardContent>
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
              <CourseProgress key={course.title} {...course} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
