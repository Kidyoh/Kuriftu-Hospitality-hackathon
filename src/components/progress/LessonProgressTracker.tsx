import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { updateLessonProgress } from '@/utils/trackingUtils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface LessonProgressTrackerProps {
  lessonId: string;
  courseId: string;
  onProgressUpdate?: (progress: number) => void;
}

export function LessonProgressTracker({ 
  lessonId, 
  courseId,
  onProgressUpdate 
}: LessonProgressTrackerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (profile?.id) {
      fetchCurrentProgress();
    }
  }, [profile?.id, lessonId, courseId]);

  const fetchCurrentProgress = async () => {
    if (!profile?.id) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_lessons')
        .select('progress, completed')
        .eq('user_id', profile.id)
        .eq('lesson_id', lessonId)
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setCurrentProgress(data.progress || 0);
        setSliderValue(data.progress || 0);
        setIsCompleted(data.completed || false);
      }
    } catch (error) {
      console.error('Error fetching lesson progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressUpdate = async (progress: number) => {
    if (!profile?.id) return;
    
    try {
      setIsSaving(true);
      
      const result = await updateLessonProgress(
        profile.id,
        lessonId,
        courseId,
        progress
      );
      
      if ('error' in result) {
        throw result.error;
      }
      
      setCurrentProgress(progress);
      setIsCompleted(progress === 100);
      
      // Notify parent component if callback exists
      if (onProgressUpdate) {
        onProgressUpdate(progress);
      }
      
      toast({
        title: progress === 100 ? t('progress.lessonCompleted') : t('progress.progressUpdated'),
        description: progress === 100 
          ? t('progress.lessonCompletedDesc') 
          : t('progress.progressUpdatedDesc', { progress }),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: t('progress.error'),
        description: t('progress.errorUpdating'),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSliderChange = (values: number[]) => {
    setSliderValue(values[0]);
  };

  const handleMarkComplete = () => {
    handleProgressUpdate(100);
  };

  const handleMarkIncomplete = () => {
    handleProgressUpdate(0);
  };
  
  const handleSaveProgress = () => {
    handleProgressUpdate(sliderValue);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle>{t('progress.trackProgress')}</CardTitle>
        <CardDescription>{t('progress.trackProgressDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('progress.currentProgress')}</span>
              <div className="flex items-center">
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : currentProgress > 0 ? (
                  <Clock className="h-4 w-4 text-amber-500 mr-2" />
                ) : null}
                <span className="text-sm font-medium">{currentProgress}%</span>
              </div>
            </div>
            
            <Progress value={currentProgress} className="h-2" />
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('progress.updateProgress')}</span>
                <span className="text-sm">{sliderValue}%</span>
              </div>
              
              <Slider
                value={[sliderValue]}
                max={100}
                step={10}
                disabled={isSaving}
                onValueChange={handleSliderChange}
                className="my-6"
              />
              
              <div className="flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isSaving || sliderValue === currentProgress}
                  onClick={handleSaveProgress}
                  className="flex-1"
                >
                  {t('progress.saveProgress')}
                </Button>
                
                {isCompleted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleMarkIncomplete}
                    className="flex-1"
                  >
                    {t('progress.markIncomplete')}
                  </Button>
                ) : (
                  <Button
                    variant={currentProgress === 100 ? "outline" : "default"}
                    size="sm"
                    disabled={isSaving}
                    onClick={handleMarkComplete}
                    className="flex-1"
                  >
                    {t('progress.markComplete')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 