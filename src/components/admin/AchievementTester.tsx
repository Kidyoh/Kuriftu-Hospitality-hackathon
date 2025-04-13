import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAchievements,
  getUserAchievements,
  updateAchievementProgress,
  awardPoints,
  checkUserAchievements,
  updateUserLoginStreak,
  Achievement
} from '@/utils/incentivesUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowRight, Award, Trophy, Flame, Sparkles } from 'lucide-react';

export function AchievementTester() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [pointsAmount, setPointsAmount] = useState<number>(10);
  const [pointsDescription, setPointsDescription] = useState<string>('Test points');

  useEffect(() => {
    async function loadAchievements() {
      if (!user) return;
      
      const { data, error } = await getAchievements();
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load achievements'
        });
        return;
      }
      
      if (data) {
        setAchievements(data);
        if (data.length > 0) {
          setSelectedAchievement(data[0].id);
        }
      }
    }
    
    loadAchievements();
  }, [user]);

  const handleProgressUpdate = async () => {
    if (!user || !selectedAchievement) return;
    
    const { data, error } = await updateAchievementProgress(
      user.id,
      selectedAchievement,
      progress
    );
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update progress: ${error.message}`
      });
      return;
    }
    
    toast({
      title: 'Success',
      description: `Achievement progress updated to ${progress}%`
    });
  };

  const handleAwardPoints = async () => {
    if (!user) return;
    
    const { success, error } = await awardPoints(
      user.id,
      pointsAmount,
      pointsDescription
    );
    
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to award points: ${error?.message || 'Unknown error'}`
      });
      return;
    }
    
    toast({
      title: 'Success',
      description: `Awarded ${pointsAmount} points to the user`
    });
  };

  const handleCheckAchievements = async () => {
    if (!user) return;
    
    const { success, error } = await checkUserAchievements(user.id);
    
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to check achievements: ${error?.message || 'Unknown error'}`
      });
      return;
    }
    
    toast({
      title: 'Success',
      description: 'Checked and updated achievements'
    });
  };

  const handleUpdateLoginStreak = async () => {
    if (!user) return;
    
    const { success, error } = await updateUserLoginStreak(user.id);
    
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update login streak: ${error?.message || 'Unknown error'}`
      });
      return;
    }
    
    toast({
      title: 'Success',
      description: 'Login streak updated'
    });
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Achievement Testing</CardTitle>
          <CardDescription>Admin access required</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You need to be an administrator to access this feature.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-primary" />
          Achievement Test Panel
        </CardTitle>
        <CardDescription>
          Tools for testing achievement and incentive functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-md font-medium flex items-center">
            <Award className="mr-2 h-4 w-4" />
            Update Achievement Progress
          </h3>
          <div className="space-y-3">
            <Select
              value={selectedAchievement}
              onValueChange={setSelectedAchievement}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an achievement" />
              </SelectTrigger>
              <SelectContent>
                {achievements.map((achievement) => (
                  <SelectItem key={achievement.id} value={achievement.id}>
                    {achievement.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Progress: {progress}%</span>
              </div>
              <Slider
                value={[progress]}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) => setProgress(value[0])}
              />
            </div>
            
            <Button onClick={handleProgressUpdate} className="w-full">
              Update Progress
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-medium flex items-center">
            <Sparkles className="mr-2 h-4 w-4" />
            Award Points
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={pointsAmount}
                onChange={(e) => setPointsAmount(parseInt(e.target.value))}
                className="w-24"
              />
              <Input 
                placeholder="Description"
                value={pointsDescription}
                onChange={(e) => setPointsDescription(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button onClick={handleAwardPoints} className="w-full">
              Award Points
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={handleCheckAchievements}
            className="flex items-center justify-center"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Check All Achievements
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleUpdateLoginStreak}
            className="flex items-center justify-center"
          >
            <Flame className="mr-2 h-4 w-4" />
            Update Login Streak
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 