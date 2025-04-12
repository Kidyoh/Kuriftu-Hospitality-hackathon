import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Achievement } from '@/integrations/supabase/custom-types';

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
}

interface AchievementItemProps {
  name: string;
  description: string;
  earned?: boolean;
  date?: string;
  icon?: string;
}

function AchievementItem({ name, description, earned, date, icon }: AchievementItemProps) {
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
          <span className="text-xs text-muted-foreground">Earned on {new Date(date).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

// Extended Achievement type with earned status
type ExtendedAchievement = Achievement & { 
  earned?: boolean; 
  earned_at?: string;
  display_order?: number;
};

export function AchievementSection() {
  const [achievements, setAchievements] = useState<ExtendedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAchievements() {
      if (!profile?.id) return;
      
      try {
        setIsLoading(true);
        
        // Fetch all achievements
        let allAchievements: ExtendedAchievement[] = [];
        try {
          // First check if display_order column exists
          const { data: columns } = await supabase
            .from('achievements')
            .select('*')
            .limit(1);

          // If we have achievements, continue
          if (columns && columns.length > 0) {
            // Use display_order if it exists, otherwise just get all achievements
            if ('display_order' in columns[0]) {
              const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .order('display_order', { ascending: true });
                
              if (error) throw error;
              allAchievements = data || [];
            } else {
              // No display_order column, just get all achievements without ordering
              const { data, error } = await supabase
                .from('achievements')
                .select('*');
                
              if (error) throw error;
              allAchievements = data || [];
            }
          }
        } catch (error) {
          console.error('Error fetching achievements:', error);
          throw error;
        }
        
        // Fetch user's earned achievements
        const { data: userAchievements, error: userAchievementsError } = await supabase
          .from('user_achievements')
          .select('achievement_id, earned_at')
          .eq('user_id', profile.id);
        
        if (userAchievementsError) throw userAchievementsError;
        
        // Map earned status to achievements
        const achievementsWithEarnedStatus = allAchievements.map(achievement => {
          const userAchievement = userAchievements?.find(
            ua => ua.achievement_id === achievement.id
          );
          
          return {
            ...achievement,
            earned: !!userAchievement,
            earned_at: userAchievement?.earned_at
          };
        });
        
        // Sort by earned status and display order
        const sortedAchievements = [...achievementsWithEarnedStatus].sort((a, b) => {
          // Earned achievements first
          if (a.earned && !b.earned) return -1;
          if (!a.earned && b.earned) return 1;
          
          // Then by display order if it exists
          if ('display_order' in a && 'display_order' in b) {
            return (a.display_order || 0) - (b.display_order || 0);
          }
          
          return 0; // Keep original order if no display_order
        });
        
        // Limit to 4 achievements for display
        setAchievements(sortedAchievements.slice(0, 4));
      } catch (error) {
        console.error("Error fetching achievements:", error);
        setError("Failed to load achievements");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAchievements();
  }, [profile?.id]);

  // Fallback achievements if none are found in the database
  const getFallbackAchievements = (): ExtendedAchievement[] => {
    return [
      {
        id: "1",
        name: "First Steps",
        description: "Complete your first course module",
        criteria: "Complete one module",
        icon: "award",
        earned: false
      },
      {
        id: "2",
        name: "Team Player",
        description: "Participate in group training sessions",
        criteria: "Join a group session",
        icon: "users",
        earned: false
      },
      {
        id: "3",
        name: "Service Expert",
        description: "Complete the full guest service pathway",
        criteria: "Complete guest service course",
        icon: "star",
        earned: false
      },
      {
        id: "4",
        name: "Problem Solver",
        description: "Complete all customer issue resolution scenarios",
        criteria: "Complete all scenarios",
        icon: "tool",
        earned: false
      }
    ];
  };

  // If no achievements are found in the database, use fallbacks
  useEffect(() => {
    if (!isLoading && !error && achievements.length === 0) {
      setAchievements(getFallbackAchievements());
    }
  }, [isLoading, error, achievements.length]);

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Your earned badges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Your earned badges and accomplishments</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate('/achievements')}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">View all achievements</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {achievements.map((achievement) => (
              <AchievementItem
                key={achievement.id}
                name={achievement.name}
                description={achievement.description}
                earned={achievement.earned}
                date={achievement.earned_at}
                icon={achievement.icon}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
