
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CompletionStepProps {
  department: string | null;
  isLoading: boolean;
  onComplete: () => void;
}

export default function CompletionStep({ department, isLoading, onComplete }: CompletionStepProps) {
  return (
    <div className="space-y-4">
      <p>Thank you for completing your onboarding! Based on your profile, we've customized your learning experience to help you grow and excel in your role.</p>
      <p>Here's what you can expect next:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Personalized course recommendations based on your skills and experience</li>
        <li>Learning paths tailored to your {department || 'role'}</li>
        <li>Progress tracking to help you stay on course</li>
        <li>Achievement badges as you complete milestones</li>
      </ul>
      
      <Button 
        onClick={onComplete}
        className="w-full mt-6"
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
