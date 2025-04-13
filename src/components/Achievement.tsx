import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AchievementProps {
  title: string;
  description: string;
  progress: number;
  totalSteps: number;
  isCompleted: boolean;
}

export function Achievement({ title, description, progress, totalSteps, isCompleted }: AchievementProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge variant={isCompleted ? "success" : "secondary"}>
            {isCompleted ? "Completed" : `${progress}/${totalSteps}`}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-secondary h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(progress / totalSteps) * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
} 