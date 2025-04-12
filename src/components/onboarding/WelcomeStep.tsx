
import React from 'react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  onContinue: () => void;
}

export default function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <div className="space-y-4">
      <p>This quick onboarding process will help us understand your role, experience, and learning needs better.</p>
      <p>Here's what we'll cover:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Basic personal information</li>
        <li>Your department and position</li>
        <li>Your experience level</li>
        <li>A quick skill assessment</li>
      </ul>
      <p>Based on your input, our AI system will recommend tailored learning paths just for you!</p>
      
      <div className="flex justify-end mt-6">
        <Button onClick={onContinue}>Let's Start</Button>
      </div>
    </div>
  );
}
