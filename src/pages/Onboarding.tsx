import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_STEPS = [
  'welcome',
  'personal-info',
  'department-selection',
  'experience',
  'skill-assessment',
  'completion'
];

interface OnboardingStep {
  id: string;
  completed: boolean;
  completed_at: string | null;
}

export default function Onboarding() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  // Form state
  const [department, setDepartment] = useState(profile?.department || '');
  const [position, setPosition] = useState(profile?.position || '');
  const [phone, setPhone] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadOnboardingProgress();
    }
  }, [user]);

  useEffect(() => {
    // Update progress bar based on current step
    setProgress(((currentStep + 1) / ONBOARDING_STEPS.length) * 100);
  }, [currentStep]);

  const loadOnboardingProgress = async () => {
    if (!user) return;

    setIsLoading(true);
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
      // Find the first uncompleted step
      const stepsMap = new Map(data.map(step => [step.step, step]));
      const firstUncompleted = ONBOARDING_STEPS.findIndex(step => {
        const stepData = stepsMap.get(step);
        return !stepData || !stepData.completed;
      });
      
      setCurrentStep(firstUncompleted >= 0 ? firstUncompleted : 0);
    }
    setIsLoading(false);
  };

  const updateOnboardingStep = async (stepId: string, completed: boolean = true) => {
    if (!user) return;

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
  };

  const completeOnboarding = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        department,
        position,
        phone,
        experience_level: experienceLevel
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete onboarding.",
      });
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    // Save current step progress
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

    // If this is the last step, complete onboarding
    if (currentStep === ONBOARDING_STEPS.length - 1) {
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
      return;
    }

    // Otherwise, move to the next step
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
  };

  const saveSkillAssessment = async (skillName: string, score: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('skill_assessments')
      .upsert({
        user_id: user.id,
        skill_name: skillName,
        score
      });

    if (error) {
      console.error('Error saving skill assessment:', error);
      return false;
    }
    
    return true;
  };

  const renderStep = () => {
    const currentStepId = ONBOARDING_STEPS[currentStep];

    switch (currentStepId) {
      case 'welcome':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Kuriftu Learning Village!</CardTitle>
              <CardDescription>
                We're excited to have you join our learning community. Let's get you set up with a personalized learning experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>This quick onboarding process will help us understand your role, experience, and learning needs better.</p>
                <p>Here's what we'll cover:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Basic personal information</li>
                  <li>Your department and position</li>
                  <li>Your experience level</li>
                  <li>A quick skill assessment</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNext}>Let's Start</Button>
            </CardFooter>
          </Card>
        );
        
      case 'personal-info':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Tell us a bit more about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="Your phone number" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        );
        
      case 'department-selection':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Role at Kuriftu</CardTitle>
              <CardDescription>Tell us about your role and department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Front Desk">Front Desk</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                      <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                      <SelectItem value="Kitchen">Kitchen</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Spa">Spa</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input 
                    id="position" 
                    placeholder="Your job title" 
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        );
        
      case 'experience':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Experience Level</CardTitle>
              <CardDescription>Help us understand your hospitality experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RadioGroup value={experienceLevel} onValueChange={setExperienceLevel}>
                  <div className="flex items-start space-x-2 py-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="beginner" className="font-medium">Beginner</Label>
                      <p className="text-sm text-muted-foreground">
                        Less than 1 year of experience in hospitality
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 py-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="intermediate" className="font-medium">Intermediate</Label>
                      <p className="text-sm text-muted-foreground">
                        1-3 years of experience in hospitality
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 py-2">
                    <RadioGroupItem value="experienced" id="experienced" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="experienced" className="font-medium">Experienced</Label>
                      <p className="text-sm text-muted-foreground">
                        3-5 years of experience in hospitality
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 py-2">
                    <RadioGroupItem value="expert" id="expert" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="expert" className="font-medium">Expert</Label>
                      <p className="text-sm text-muted-foreground">
                        More than 5 years of experience in hospitality
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        );
        
      case 'skill-assessment':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Skill Self-Assessment</CardTitle>
              <CardDescription>Rate your confidence level in these key areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {assessmentQuestions.map((question, index) => (
                  <div key={index} className="space-y-3">
                    <Label>{question.text}</Label>
                    <RadioGroup 
                      value={assessmentAnswers[question.id] || ''} 
                      onValueChange={(value) => {
                        setAssessmentAnswers(prev => ({
                          ...prev,
                          [question.id]: value
                        }));
                        saveSkillAssessment(question.id, parseInt(value));
                      }}
                      className="flex space-x-2"
                    >
                      {[1, 2, 3, 4, 5].map(value => (
                        <div key={value} className="flex flex-col items-center">
                          <RadioGroupItem value={value.toString()} id={`${question.id}-${value}`} className="mb-1" />
                          <Label htmlFor={`${question.id}-${value}`} className="text-xs">{value}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Not confident</span>
                      <span>Very confident</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        );
        
      case 'completion':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Complete!</CardTitle>
              <CardDescription>You're all set to start your learning journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>Thank you for completing your onboarding! Based on your profile, we'll customize your learning experience to help you grow and excel in your role.</p>
                <p>Here's what you can expect next:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Personalized course recommendations</li>
                  <li>Learning paths tailored to your role and department</li>
                  <li>Progress tracking to help you stay on course</li>
                  <li>Achievement badges as you complete milestones</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleNext} className="w-full">
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        );
        
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
            <p>Loading...</p>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
}

// Sample assessment questions
const assessmentQuestions = [
  { id: 'guest_communication', text: 'How confident are you in communicating with guests?' },
  { id: 'problem_solving', text: 'How would you rate your problem-solving abilities?' },
  { id: 'teamwork', text: 'How comfortable are you working in a team?' },
  { id: 'hospitality_knowledge', text: 'How would you rate your knowledge of hospitality standards?' },
];
