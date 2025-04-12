
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
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

// Define the assessment questions for each department
const DEPARTMENT_QUESTIONS = {
  'Front Desk': [
    { id: 'guest_communication', text: 'How confident are you in communicating with guests?' },
    { id: 'problem_solving', text: 'How would you rate your problem-solving abilities?' },
    { id: 'reservation_systems', text: 'How comfortable are you with using reservation systems?' },
    { id: 'conflict_resolution', text: 'How would you rate your conflict resolution skills?' },
    { id: 'hotel_knowledge', text: 'How would you rate your knowledge of hotel amenities and services?' },
  ],
  'Housekeeping': [
    { id: 'cleaning_standards', text: 'How confident are you in maintaining cleaning standards?' },
    { id: 'attention_to_detail', text: 'How would you rate your attention to detail?' },
    { id: 'time_management', text: 'How efficient are you with managing your time?' },
    { id: 'room_inspection', text: 'How comfortable are you with room inspection procedures?' },
    { id: 'safety_protocols', text: 'How would you rate your knowledge of safety protocols?' },
  ],
  'Food & Beverage': [
    { id: 'food_safety', text: 'How knowledgeable are you about food safety standards?' },
    { id: 'service_etiquette', text: 'How confident are you in your service etiquette?' },
    { id: 'beverage_knowledge', text: 'How would you rate your knowledge of beverages?' },
    { id: 'order_taking', text: 'How efficient are you with taking and managing orders?' },
    { id: 'table_service', text: 'How comfortable are you with formal table service?' },
  ],
  'Kitchen': [
    { id: 'cooking_techniques', text: 'How confident are you in various cooking techniques?' },
    { id: 'food_presentation', text: 'How would you rate your food presentation skills?' },
    { id: 'kitchen_organization', text: 'How organized are you in a kitchen environment?' },
    { id: 'recipe_following', text: 'How comfortable are you with following recipes precisely?' },
    { id: 'ingredient_knowledge', text: 'How would you rate your knowledge of ingredients?' },
  ],
  'Maintenance': [
    { id: 'technical_skills', text: 'How confident are you in your technical maintenance skills?' },
    { id: 'problem_diagnosis', text: 'How would you rate your ability to diagnose problems?' },
    { id: 'safety_procedures', text: 'How knowledgeable are you about safety procedures?' },
    { id: 'preventive_maintenance', text: 'How comfortable are you with preventive maintenance?' },
    { id: 'equipment_knowledge', text: 'How would you rate your knowledge of hotel equipment?' },
  ],
  'Spa': [
    { id: 'treatment_knowledge', text: 'How knowledgeable are you about spa treatments?' },
    { id: 'client_care', text: 'How confident are you in providing excellent client care?' },
    { id: 'product_knowledge', text: 'How would you rate your knowledge of spa products?' },
    { id: 'relaxation_techniques', text: 'How skilled are you at relaxation techniques?' },
    { id: 'hygiene_standards', text: 'How would you rate your adherence to hygiene standards?' },
  ],
  'Management': [
    { id: 'leadership', text: 'How confident are you in your leadership abilities?' },
    { id: 'staff_management', text: 'How would you rate your staff management skills?' },
    { id: 'budget_planning', text: 'How comfortable are you with budget planning?' },
    { id: 'conflict_resolution', text: 'How skilled are you at resolving conflicts?' },
    { id: 'strategic_thinking', text: 'How would you rate your strategic thinking abilities?' },
  ],
  'Other': [
    { id: 'guest_communication', text: 'How confident are you in communicating with guests?' },
    { id: 'problem_solving', text: 'How would you rate your problem-solving abilities?' },
    { id: 'teamwork', text: 'How comfortable are you working in a team?' },
    { id: 'hospitality_knowledge', text: 'How would you rate your knowledge of hospitality standards?' },
    { id: 'adaptability', text: 'How would you rate your adaptability to new situations?' },
  ],
};

// Form schema for personal information
const personalInfoSchema = z.object({
  phone: z.string().min(1, { message: "Phone number is required" }),
});

// Form schema for department selection
const departmentSchema = z.object({
  department: z.string().min(1, { message: "Department is required" }),
  position: z.string().min(1, { message: "Position is required" }),
});

// Form schema for experience level
const experienceSchema = z.object({
  experienceLevel: z.string().min(1, { message: "Please select your experience level" }),
});

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
  const [phone, setPhone] = useState(profile?.phone || '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || '');
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Forms setup
  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { phone: profile?.phone || '' },
  });

  const departmentForm = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      department: profile?.department || '',
      position: profile?.position || '',
    },
  });

  const experienceForm = useForm<z.infer<typeof experienceSchema>>({
    resolver: zodResolver(experienceSchema),
    defaultValues: { experienceLevel: profile?.experience_level || '' },
  });

  // Get the current assessment questions based on selected department
  const getCurrentAssessmentQuestions = () => {
    return DEPARTMENT_QUESTIONS[department as keyof typeof DEPARTMENT_QUESTIONS] || DEPARTMENT_QUESTIONS.Other;
  };

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

  const handlePersonalInfoSubmit = async (values: z.infer<typeof personalInfoSchema>) => {
    setPhone(values.phone);
    await handleStepComplete();
  };

  const handleDepartmentSubmit = async (values: z.infer<typeof departmentSchema>) => {
    setDepartment(values.department);
    setPosition(values.position);
    await handleStepComplete();
  };

  const handleExperienceSubmit = async (values: z.infer<typeof experienceSchema>) => {
    setExperienceLevel(values.experienceLevel);
    await handleStepComplete();
  };

  const handleStepComplete = async () => {
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

    // Move to the next step
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
  };

  const getAiRecommendations = async () => {
    if (!user) return;
    
    setIsAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-recommendations", {
        body: {
          userProfile: {
            department,
            position,
            experience_level: experienceLevel
          },
          assessmentResults: assessmentAnswers
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
                <p>Based on your input, our AI system will recommend tailored learning paths just for you!</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleStepComplete}>Let's Start</Button>
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
            <Form {...personalInfoForm}>
              <form onSubmit={personalInfoForm.handleSubmit(handlePersonalInfoSubmit)}>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={personalInfoForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button type="submit">Continue</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        );
        
      case 'department-selection':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Role at Kuriftu</CardTitle>
              <CardDescription>Tell us about your role and department</CardDescription>
            </CardHeader>
            <Form {...departmentForm}>
              <form onSubmit={departmentForm.handleSubmit(handleDepartmentSubmit)}>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={departmentForm.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setDepartment(value);
                              }}
                            >
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={departmentForm.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input placeholder="Your job title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button type="submit">Continue</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        );
        
      case 'experience':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Experience Level</CardTitle>
              <CardDescription>Help us understand your hospitality experience</CardDescription>
            </CardHeader>
            <Form {...experienceForm}>
              <form onSubmit={experienceForm.handleSubmit(handleExperienceSubmit)}>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={experienceForm.control}
                      name="experienceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup 
                              value={field.value} 
                              onValueChange={field.onChange}
                              className="space-y-4"
                            >
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button type="submit">Continue</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        );
        
      case 'skill-assessment':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Skill Self-Assessment</CardTitle>
              <CardDescription>
                Rate your confidence level in these key areas specific to your {department} role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {getCurrentAssessmentQuestions().map((question, index) => (
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
              <Button 
                onClick={getAiRecommendations} 
                disabled={isAiLoading || Object.keys(assessmentAnswers).length < 3}
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing your responses...
                  </>
                ) : (
                  'Get Personalized Recommendations'
                )}
              </Button>
            </CardFooter>
          </Card>
        );
        
      case 'ai-recommendations':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Personalized Learning Plan</CardTitle>
              <CardDescription>
                Based on your profile and assessment, here are our AI-powered recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {aiRecommendations ? (
                  <>
                    <div className="bg-secondary/30 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Analysis</h3>
                      <p>{aiRecommendations.analysis}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Recommended Courses</h3>
                      <div className="space-y-4">
                        {aiRecommendations.recommendedCourses.map((course: any, i: number) => (
                          <div key={i} className="border rounded-lg p-4">
                            <h4 className="font-medium">{course.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                            <div className="flex justify-between items-center mt-2 text-xs">
                              <span className="text-primary">{course.importance}</span>
                              <span>{course.hours} hours</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Recommended Learning Path</h3>
                      <p>{aiRecommendations.recommendedLearningPath}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">Loading your personalized recommendations...</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleStepComplete}>Continue</Button>
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
                <p>Thank you for completing your onboarding! Based on your profile, we've customized your learning experience to help you grow and excel in your role.</p>
                <p>Here's what you can expect next:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Personalized course recommendations based on your skills and experience</li>
                  <li>Learning paths tailored to your {department} role</li>
                  <li>Progress tracking to help you stay on course</li>
                  <li>Achievement badges as you complete milestones</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={async () => {
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
                }} 
                className="w-full"
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading...</p>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
}
