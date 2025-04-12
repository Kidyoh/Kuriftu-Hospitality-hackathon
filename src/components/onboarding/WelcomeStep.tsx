
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, UserCircle, Award } from 'lucide-react';

interface WelcomeStepProps {
  onContinue: () => void;
}

export default function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div className="bg-primary/10 p-4 rounded-lg mb-4">
        <h2 className="text-xl font-medium text-primary mb-2">Welcome to Kuriftu Learning Village!</h2>
        <p className="text-muted-foreground">This quick onboarding process will help us understand your role, experience, and learning needs better.</p>
      </div>
      
      <p>Here's what we'll cover:</p>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <UserCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-medium">Basic personal information</h3>
            <p className="text-xs text-muted-foreground">Your contact details help us keep you updated</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-medium">Your department and position</h3>
            <p className="text-xs text-muted-foreground">Understanding your role helps us tailor your experience</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-medium">Your experience level</h3>
            <p className="text-xs text-muted-foreground">This helps us match content to your expertise</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Award className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-medium">A quick skill assessment</h3>
            <p className="text-xs text-muted-foreground">To identify areas where you can grow</p>
          </div>
        </div>
      </div>
      
      <div className="bg-secondary/30 p-4 rounded-lg mt-6">
        <p className="text-sm">Based on your input, our AI system will recommend tailored learning paths just for you!</p>
      </div>
      
      <div className="flex justify-end mt-8">
        <Button onClick={onContinue} className="px-6">Let's Start</Button>
      </div>
    </div>
  );
}
