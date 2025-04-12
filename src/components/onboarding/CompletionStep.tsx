
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, BookOpen, Trophy, BarChart3 } from 'lucide-react';

interface CompletionStepProps {
  department: string | null;
  isLoading: boolean;
  onComplete: () => void;
}

export default function CompletionStep({ department, isLoading, onComplete }: CompletionStepProps) {
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
        onClick={onComplete}
        className="w-full mt-8"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finishing setup...
          </>
        ) : (
          'Go to Dashboard'
        )}
      </Button>
    </div>
  );
}
