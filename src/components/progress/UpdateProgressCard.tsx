import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateLessonProgress } from '@/utils/trackingUtils';

interface UpdateProgressCardProps {
  lessonId: string;
  courseId: string;
  currentProgress?: number;
  onProgressUpdate?: (progress: number) => void;
}

export function UpdateProgressCard({ 
  lessonId, 
  courseId, 
  currentProgress = 0,
  onProgressUpdate 
}: UpdateProgressCardProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [progress, setProgress] = useState<number>(currentProgress);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleProgressUpdate = async (newProgress: number) => {
    if (!profile?.id) return;
    
    try {
      setIsSaving(true);
      
      const result = await updateLessonProgress(
        profile.id,
        lessonId,
        courseId,
        newProgress
      );
      
      if ('error' in result) {
        throw result.error;
      }
      
      if (onProgressUpdate) {
        onProgressUpdate(newProgress);
      }
      
      toast({
        title: newProgress === 100 ? "Lesson Completed" : "Progress Updated",
        description: newProgress === 100 
          ? "Congratulations on completing this lesson!" 
          : `Your progress has been updated to ${newProgress}%`,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update your progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle>Update Your Progress</CardTitle>
        <CardDescription>Manually track how far you've gotten in this lesson</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Current Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
        
        <div className="mt-4 mb-2">
          <span className="text-sm font-medium">Set your progress</span>
        </div>
        
        <Slider
          value={[progress]}
          max={100}
          step={10}
          onValueChange={(values) => setProgress(values[0])}
          className="my-6"
        />
        
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            className="flex-1"
            disabled={isSaving || progress === currentProgress}
            onClick={() => handleProgressUpdate(progress)}
          >
            Save Progress
          </Button>
          
          <Button 
            className="flex-1"
            disabled={isSaving || progress === 100}
            onClick={() => {
              setProgress(100);
              handleProgressUpdate(100);
            }}
          >
            Mark as Complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 