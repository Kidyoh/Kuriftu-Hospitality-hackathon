import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserAchievements, 
  getUserAchievementSummary,
  UserAchievement,
  AchievementSummary
} from '@/utils/incentivesUtils';
import { Award, Trophy, Star } from 'lucide-react';

const AchievementItem = ({ achievement }: { achievement: UserAchievement }) => {
  const { achievement: achievementData, progress, completed } = achievement;
  const progressPercentage = Math.min(
    Math.round((progress / (achievementData.required_progress || 100)) * 100),
    100
  );

  return (
    <Card className="border-muted mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${completed ? 'bg-primary/20' : 'bg-muted'}`}>
            <Trophy className={`h-5 w-5 ${completed ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{achievementData.title || achievementData.name}</h4>
              <Badge variant={completed ? "default" : "outline"} className="ml-2 text-xs">
                {completed ? 'Earned' : `${progressPercentage}%`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {achievementData.description}
            </p>
            
            <div className="mt-3">
              <Progress value={progressPercentage} className="h-1" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {progress} / {achievementData.required_progress || 100}
                </span>
                {achievement.completed_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(achievement.completed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AchievementSummaryDisplay = ({ summary }: { summary: AchievementSummary }) => {
  return (
    <div className="mb-4 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Overall Progress</span>
        <span className="text-sm">{summary.completion_percentage}%</span>
      </div>
      
      <Progress value={summary.completion_percentage} className="h-2" />
      
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="bg-muted p-2 rounded-md text-center">
          <div className="text-sm font-bold">{summary.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        
        <div className="bg-green-50 p-2 rounded-md text-center">
          <div className="text-sm font-bold text-green-600">{summary.completed}</div>
          <div className="text-xs text-green-600">Completed</div>
        </div>
        
        <div className="bg-blue-50 p-2 rounded-md text-center">
          <div className="text-sm font-bold text-blue-600">{summary.in_progress}</div>
          <div className="text-xs text-blue-600">In Progress</div>
        </div>
      </div>
    </div>
  );
};

export const AchievementsCard = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch achievements and summary in parallel
        const [achievementsResult, summaryResult] = await Promise.all([
          getUserAchievements(user.id),
          getUserAchievementSummary(user.id)
        ]);
        
        if (achievementsResult.data) {
          setAchievements(achievementsResult.data as UserAchievement[]);
        }
        
        if (summaryResult.data) {
          setSummary(summaryResult.data);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
  }, [user?.id]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Achievements</CardTitle>
        </div>
        <CardDescription>
          Track your learning milestones
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </>
        ) : (
          <>
            {summary && <AchievementSummaryDisplay summary={summary} />}
            
            {achievements.length > 0 ? (
              <div className="space-y-2">
                {achievements.slice(0, 3).map((achievement) => (
                  <AchievementItem 
                    key={achievement.id} 
                    achievement={achievement} 
                  />
                ))}
                
                {achievements.length > 3 && (
                  <div className="text-center mt-2">
                    <a href="/achievements" className="text-sm text-primary hover:underline">
                      View all {achievements.length} achievements
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-medium">No achievements yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete courses and activities to earn achievements
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementsCard; 