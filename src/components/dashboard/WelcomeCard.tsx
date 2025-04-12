
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle } from 'lucide-react';

interface WelcomeCardProps {
  name?: string;
  role?: string;
}

export function WelcomeCard({ name = "Team Member", role = "Hotel Staff" }: WelcomeCardProps) {
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
            Continue your learning journey and build excellence in hospitality.
          </p>
          <div className="flex space-x-2">
            <Button className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Continue Learning
            </Button>
            <Button variant="outline">View Path</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
