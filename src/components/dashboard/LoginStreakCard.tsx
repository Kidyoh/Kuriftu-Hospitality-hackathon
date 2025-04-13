import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Flame, Trophy, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatStreakMessage } from '@/utils/incentivesUtils';
import { Progress } from '@/components/ui/progress';

export function LoginStreakCard() {
  const { loginStreak } = useAuth();
  
  if (!loginStreak) {
    return null;
  }
  
  const { current_streak, longest_streak } = loginStreak;
  const nextMilestone = current_streak < 7 ? 7 : 
                        current_streak < 14 ? 14 : 
                        current_streak < 30 ? 30 : 
                        current_streak < 60 ? 60 : 
                        current_streak < 90 ? 90 : 100;
  
  const progressToNextMilestone = Math.min(100, Math.floor((current_streak / nextMilestone) * 100));
  const streakMessage = formatStreakMessage(current_streak);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Learning Streak</CardTitle>
          {current_streak >= 7 && (
            <Badge variant="default" className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              <span>On Fire</span>
            </Badge>
          )}
        </div>
        <CardDescription>
          Your daily learning activity
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex flex-col items-center bg-primary/10 rounded-xl p-3 flex-1">
            <Flame className="h-5 w-5 text-primary mb-1" />
            <span className="text-xs text-muted-foreground">Current</span>
            <span className="text-2xl font-bold">{current_streak}</span>
            <span className="text-xs">days</span>
          </div>
          
          <div className="flex flex-col items-center bg-primary/5 rounded-xl p-3 flex-1">
            <Trophy className="h-5 w-5 text-amber-500 mb-1" />
            <span className="text-xs text-muted-foreground">Best</span>
            <span className="text-2xl font-bold">{longest_streak}</span>
            <span className="text-xs">days</span>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Next milestone: {nextMilestone} days</span>
            <span className="text-sm">{current_streak}/{nextMilestone}</span>
          </div>
          <Progress value={progressToNextMilestone} className="h-2" />
        </div>
        
        <p className="text-sm mt-4 text-muted-foreground">
          {streakMessage}
        </p>
        
        <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          <span>Come back daily to increase your streak</span>
        </div>
      </CardContent>
    </Card>
  );
} 