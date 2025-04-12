
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, BookOpen, Trophy, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CompletionStepProps {
  department: string | null;
  isLoading: boolean;
  onComplete: () => Promise<boolean>;
  aiRecommendations?: {
    analysis: string;
    recommendedCourses: {
      title: string;
      description: string;
      importance: string;
      hours: number;
    }[];
    recommendedLearningPath: string;
  } | null;
}

export default function CompletionStep({ 
  department, 
  isLoading, 
  onComplete,
  aiRecommendations
}: CompletionStepProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // First save the learning path if we have AI recommendations
      if (aiRecommendations?.recommendedCourses?.length) {
        await saveLearningPath();
      }
      
      // Then complete the onboarding
      const completed = await onComplete();
      if (!completed) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to complete onboarding. Please try again."
        });
      }
    } catch (error) {
      console.error('Error during completion step:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveLearningPath = async () => {
    if (!aiRecommendations?.recommendedCourses?.length) return;
    
    try {
      // Create courses from AI recommendations
      const coursePromises = aiRecommendations.recommendedCourses.map(async (course, index) => {
        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: course.title,
            description: course.description,
            estimated_hours: course.hours,
            difficulty_level: determineDifficulty(course.importance)
          })
          .select('id')
          .single();
          
        if (error) {
          console.error('Error creating course:', error);
          throw error;
        }
        
        return { courseId: data.id, sequenceOrder: index + 1 };
      });
      
      const courseResults = await Promise.all(coursePromises);
      
      // Create learning path
      const { data: pathData, error: pathError } = await supabase
        .from('learning_paths')
        .insert({
          name: `${department || 'General'} Personalized Learning Path`,
          description: aiRecommendations.recommendedLearningPath,
          department: department,
          role: 'trainee'
        })
        .select('id')
        .single();
        
      if (pathError) {
        console.error('Error creating learning path:', pathError);
        throw pathError;
      }
      
      // Associate courses with learning path
      const pathCoursePromises = courseResults.map(async (course) => {
        const { error } = await supabase
          .from('path_courses')
          .insert({
            path_id: pathData.id,
            course_id: course.courseId,
            sequence_order: course.sequenceOrder
          });
          
        if (error) {
          console.error('Error associating course with path:', error);
          throw error;
        }
      });
      
      await Promise.all(pathCoursePromises);
      
      toast({
        title: "Learning Path Created",
        description: "Your personalized learning path has been created based on your assessment."
      });
      
    } catch (error) {
      console.error('Error saving learning path:', error);
      toast({
        variant: "destructive",
        title: "Warning",
        description: "Your profile was saved but there was an issue creating your learning path."
      });
    }
  };

  // Helper function to determine course difficulty from AI importance
  const determineDifficulty = (importance: string): string => {
    const lowercased = importance.toLowerCase();
    if (lowercased.includes('essential') || lowercased.includes('critical')) {
      return 'Beginner';
    } else if (lowercased.includes('advanced')) {
      return 'Advanced';
    } else if (lowercased.includes('expert')) {
      return 'Expert';
    } else {
      return 'Intermediate';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <h2 className="text-xl font-medium text-center">Onboarding Complete!</h2>
      
      <p className="text-center text-muted-foreground">
        Thank you for completing your onboarding! Based on your profile, we've customized your learning experience to help you grow and excel in your role.
      </p>
      
      {aiRecommendations && (
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
          <h3 className="font-medium mb-2">Your Personalized Learning Path</h3>
          <p className="text-sm mb-3">{aiRecommendations.recommendedLearningPath}</p>
          
          <h4 className="text-sm font-medium mb-2">Key Courses:</h4>
          <ul className="space-y-1 text-sm">
            {aiRecommendations.recommendedCourses.slice(0, 3).map((course, index) => (
              <li key={index} className="flex items-center">
                <div className="mr-2 h-2 w-2 rounded-full bg-primary"></div>
                {course.title} ({course.hours}h)
              </li>
            ))}
            {aiRecommendations.recommendedCourses.length > 3 && (
              <li className="text-xs text-muted-foreground pl-4">
                +{aiRecommendations.recommendedCourses.length - 3} more courses
              </li>
            )}
          </ul>
        </div>
      )}
      
      <div className="bg-primary/10 p-5 rounded-lg">
        <h3 className="font-medium mb-3">Here's what you can expect next:</h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm">Personalized course recommendations based on your skills and experience</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm">Learning paths tailored to your {department || 'role'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm">Progress tracking to help you stay on course</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm">Achievement badges as you complete milestones</p>
            </div>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleComplete}
        className="w-full mt-8"
        disabled={isLoading || isSaving}
      >
        {isLoading || isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isSaving ? 'Saving your learning path...' : 'Finishing setup...'}
          </>
        ) : (
          'Go to Dashboard'
        )}
      </Button>
    </div>
  );
}
