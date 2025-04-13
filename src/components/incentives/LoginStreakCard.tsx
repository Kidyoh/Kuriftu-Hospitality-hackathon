import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Trophy, Calendar } from 'lucide-react';
import { useLoginStreak } from '@/hooks/useLoginStreak';
import { differenceInDays, format, isSameDay } from 'date-fns';

export const LoginStreakCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentStreak, longestStreak, lastLogin, loading } = useLoginStreak();
  
  // Determine if the user logged in today
  const isLoggedInToday = lastLogin ? isSameDay(new Date(), lastLogin) : false;
  
  // Calculate days since last login
  const daysSinceLastLogin = lastLogin 
    ? differenceInDays(new Date(), lastLogin) 
    : 0;
  
  // Get appropriate message based on streak
  const getStreakMessage = () => {
    if (currentStreak === 0) return "Start your learning journey today!";
    if (currentStreak === 1) return "You've started your streak! Come back tomorrow to continue.";
    if (currentStreak < 7) return `Keep going! You're building momentum.`;
    if (currentStreak < 14) return "Amazing consistency! You're developing great habits.";
    if (currentStreak < 30) return "Incredible dedication! You're on your way to mastery.";
    return "Phenomenal commitment! You're in the elite learning league now!";
  };
  
  // Create a 7-day week visualization
  const renderWeekView = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    return (
      <div className="flex justify-between mt-4 mb-2">
        {days.map((day, index) => {
          // Determine if this day is part of the streak
          // For simplicity, we just fill in days based on current streak
          const isActive = isLoggedInToday 
            ? index < currentStreak % 7 || index === currentStreak % 7
            : index < currentStreak % 7;
            
          return (
            <div 
              key={index} 
              className={`w-8 h-8 flex items-center justify-center rounded-full 
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Flame className="mr-2 h-5 w-5 text-amber-500" />
              Login Streak
            </CardTitle>
            <CardDescription>
              Consistency builds expertise
            </CardDescription>
          </div>
          
          {!loading && (
            <Badge variant={currentStreak > 0 ? "default" : "outline"} className="ml-auto">
              {currentStreak} day{currentStreak !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="flex justify-between">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Current</span>
              <span className="text-sm text-muted-foreground">Record: {longestStreak} days</span>
            </div>
            
            <Progress 
              value={(currentStreak / Math.max(longestStreak, 7)) * 100} 
              className="h-2"
            />
            
            {renderWeekView()}
            
            <div className="flex items-start gap-3 mt-4">
              <div className={`p-2 rounded-full ${isLoggedInToday ? 'bg-green-100' : 'bg-amber-100'}`}>
                {isLoggedInToday 
                  ? <Trophy className="h-5 w-5 text-green-500" /> 
                  : <Calendar className="h-5 w-5 text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isLoggedInToday 
                    ? "You've logged in today!" 
                    : `Last login: ${lastLogin ? format(lastLogin, 'MMM d') : 'Never'}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getStreakMessage()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginStreakCard; 