import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import WelcomeStep from '@/components/onboarding/WelcomeStep';
import PersonalInfoForm from '@/components/onboarding/PersonalInfoForm';
import DepartmentForm from '@/components/onboarding/DepartmentForm';
import ExperienceForm from '@/components/onboarding/ExperienceForm';
import SkillAssessment from '@/components/onboarding/SkillAssessment';
import AiRecommendations from '@/components/onboarding/AiRecommendations';
import CompletionStep from '@/components/onboarding/CompletionStep';

const ONBOARDING_STEPS = [
  'welcome',
  'personal-info',
  'department-selection',
  'experience',
  'skill-assessment',
  'ai-recommendations',
  'completion'
];

interface OnboardingStep {
  id: string;
  completed: boolean;
  completed_at: string | null;
}

interface AiRecommendation {
  analysis: string;
  recommendedCourses: {
    title: string;
    description: string;
    importance: string;
    hours: number;
  }[];
  recommendedLearningPath: string;
}

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  const [phone, setPhone] = useState(profile?.phone || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [position, setPosition] = useState(profile?.position || '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || '');
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadOnboardingProgress();
    }
  }, [user]);

  useEffect(() => {
    setProgress(((currentStep + 1) / ONBOARDING_STEPS.length) * 100);
  }, [currentStep]);

  const loadOnboardingProgress = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading onboarding progress:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load onboarding progress.",
        });
      } else if (data) {
        setSteps(data);
        const stepsMap = new Map(data.map(step => [step.step, step]));
        const firstUncompleted = ONBOARDING_STEPS.findIndex(step => {
          const stepData = stepsMap.get(step);
          return !stepData || !stepData.completed;
        });
        
        setCurrentStep(firstUncompleted >= 0 ? firstUncompleted : 0);
      }
    } catch (error) {
      console.error('Unexpected error loading onboarding progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOnboardingStep = async (stepId: string, completed: boolean = true) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          step: stepId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });

      if (error) {
        console.error('Error updating onboarding step:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected error updating onboarding step:', error);
      return false;
    }
  };

  const completeOnboarding = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not found. Please try logging in again.",
      });
      return false;
    }

    setIsLoading(true);
    try {
      console.log("Completing onboarding for user:", user.id);
      console.log("Updating profile with:", {
        onboarding_completed: true,
        department,
        position,
        phone,
        experience_level: experienceLevel
      });

      const { error, data } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          department,
          position,
          phone,
          experience_level: experienceLevel
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Error completing onboarding:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to complete onboarding: ${error.message}`,
        });
        return false;
      }

      console.log("Onboarding completed successfully, profile data:", data);
      
      await refreshProfile();
      
      toast({
        title: "Onboarding complete!",
        description: "You're all set to start using the platform.",
      });
      return true;
    } catch (error) {
      console.error('Unexpected error completing onboarding:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `An unexpected error occurred: ${error.message}`,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalInfoSubmit = async (values: { phone: string }) => {
    setPhone(values.phone);
    await handleStepComplete();
  };

  const handleDepartmentSubmit = async (values: { department: string, position: string }) => {
    setDepartment(values.department);
    setPosition(values.position);
    await handleStepComplete();
  };

  const handleExperienceSubmit = async (values: { experienceLevel: string }) => {
    setExperienceLevel(values.experienceLevel);
    await handleStepComplete();
  };

  const handleStepComplete = async () => {
    const currentStepId = ONBOARDING_STEPS[currentStep];
    const updated = await updateOnboardingStep(currentStepId);

    if (!updated) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your progress.",
      });
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
  };

  const getAiRecommendations = async (answers: Record<string, string>) => {
    if (!user) return;
    
    setAssessmentAnswers(answers);
    setIsAiLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-recommendations", {
        body: {
          userProfile: {
            department,
            position,
            experience_level: experienceLevel
          },
          assessmentResults: answers
        }
      });

      if (error) {
        console.error('Error getting AI recommendations:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to get AI recommendations.",
        });
      } else {
        setAiRecommendations(data);
        await updateOnboardingStep(ONBOARDING_STEPS[currentStep]);
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error invoking AI recommendations function:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get AI recommendations.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const finishOnboarding = async () => {
    setIsLoading(true);
    const completed = await completeOnboarding();
    setIsLoading(false);
    
    if (completed) {
      toast({
        title: "Onboarding complete!",
        description: "You're all set to start using the platform.",
      });
      navigate('/');
    }
  };

  const renderStep = () => {
    const currentStepId = ONBOARDING_STEPS[currentStep];

    switch (currentStepId) {
      case 'welcome':
        return <WelcomeStep onContinue={handleStepComplete} />;
        
      case 'personal-info':
        return <PersonalInfoForm defaultValue={phone} onSubmit={handlePersonalInfoSubmit} onBack={handleBack} />;
        
      case 'department-selection':
        return (
          <DepartmentForm 
            defaultValues={{ department, position }} 
            onSubmit={handleDepartmentSubmit} 
            onBack={handleBack}
            onDepartmentChange={setDepartment}
          />
        );
        
      case 'experience':
        return <ExperienceForm defaultValue={experienceLevel} onSubmit={handleExperienceSubmit} onBack={handleBack} />;
        
      case 'skill-assessment':
        return user ? (
          <SkillAssessment 
            department={department || 'Other'} 
            userId={user.id} 
            onBack={handleBack} 
            onComplete={getAiRecommendations}
          />
        ) : null;
        
      case 'ai-recommendations':
        return (
          <AiRecommendations 
            recommendations={aiRecommendations} 
            isLoading={isAiLoading} 
            onBack={handleBack}
            onContinue={handleStepComplete}
          />
        );
        
      case 'completion':
        return <CompletionStep department={department} isLoading={isLoading} onComplete={finishOnboarding} />;
        
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center mb-2">Kuriftu Learning Village</h1>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Getting started</span>
            <span>Complete</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{ONBOARDING_STEPS[currentStep].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</CardTitle>
              <CardDescription>
                {currentStep === 0 && "Welcome to Kuriftu Learning Village!"}
                {currentStep === 1 && "Tell us a bit more about yourself"}
                {currentStep === 2 && "Tell us about your role and department"}
                {currentStep === 3 && "Help us understand your hospitality experience"}
                {currentStep === 4 && `Rate your confidence level in these key areas specific to your ${department || 'role'}`}
                {currentStep === 5 && "Based on your profile and assessment, here are our AI-powered recommendations"}
                {currentStep === 6 && "You're all set to start your learning journey"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStep()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
