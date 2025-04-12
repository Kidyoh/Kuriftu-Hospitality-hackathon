
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface AchievementItemProps {
  name: string;
  description: string;
  earned?: boolean;
  date?: string;
}

function AchievementItem({ name, description, earned, date }: AchievementItemProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-b-0">
      <div className={`p-2 rounded-full ${earned ? 'bg-primary/20' : 'bg-muted'}`}>
        <Award className={`h-6 w-6 ${earned ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{name}</h4>
          {earned && (
            <Badge variant="secondary" className="text-xs">Earned</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {description}
        </p>
        {earned && date && (
          <span className="text-xs text-muted-foreground">Earned on {date}</span>
        )}
      </div>
    </div>
  );
}

export function AchievementSection() {
  const achievements = [
    {
      name: "First Steps",
      description: "Complete your first course module",
      earned: true,
      date: "Apr 2, 2025"
    },
    {
      name: "Team Player",
      description: "Participate in group training sessions",
      earned: true,
      date: "Apr 8, 2025"
    },
    {
      name: "Service Expert",
      description: "Complete the full guest service pathway",
      earned: false
    },
    {
      name: "Problem Solver",
      description: "Complete all customer issue resolution scenarios",
      earned: false
    }
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Your earned badges and accomplishments</CardDescription>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <a href="/achievements">
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">View all achievements</span>
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {achievements.map((achievement) => (
            <AchievementItem
              key={achievement.name}
              name={achievement.name}
              description={achievement.description}
              earned={achievement.earned}
              date={achievement.date}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
