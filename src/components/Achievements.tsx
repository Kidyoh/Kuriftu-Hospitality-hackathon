import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  completed: boolean;
  category: string;
  points: number;
}

export default function Achievements() {
  const [achievements, setAchievements] = React.useState<Achievement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAchievements = async () => {
      try {
        // TODO: Replace with actual API call
        const mockAchievements: Achievement[] = [
          {
            id: '1',
            title: 'First Steps',
            description: 'Complete your first lesson',
            progress: 100,
            completed: true,
            category: 'Learning',
            points: 50,
          },
          {
            id: '2',
            title: 'Knowledge Seeker',
            description: 'Complete 5 lessons in a row',
            progress: 60,
            completed: false,
            category: 'Learning',
            points: 100,
          },
          // Add more mock achievements as needed
        ];
        
        setAchievements(mockAchievements);
        setLoading(false);
      } catch (err) {
        setError('Failed to load achievements');
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading achievements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h2 className="text-3xl font-bold mb-6">Your Achievements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <Card 
            key={achievement.id}
            className={cn(
              "transition-all hover:scale-105",
              achievement.completed && "border-green-500 border-2"
            )}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{achievement.title}</CardTitle>
                <Badge variant={achievement.completed ? "success" : "secondary"}>
                  {achievement.points} pts
                </Badge>
              </div>
              <CardDescription>{achievement.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={achievement.progress} />
                <p className="text-sm text-right text-muted-foreground">
                  {achievement.progress}% Complete
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 