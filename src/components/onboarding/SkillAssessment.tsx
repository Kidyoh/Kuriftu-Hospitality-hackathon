
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  text: string;
}

interface SkillAssessmentProps {
  department: string;
  userId: string;
  onBack: () => void;
  onComplete: (answers: Record<string, string>) => void;
}

// Define the assessment questions for each department
const DEPARTMENT_QUESTIONS: Record<string, Question[]> = {
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

export default function SkillAssessment({ department, userId, onBack, onComplete }: SkillAssessmentProps) {
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const getQuestions = () => {
    return DEPARTMENT_QUESTIONS[department as keyof typeof DEPARTMENT_QUESTIONS] || DEPARTMENT_QUESTIONS.Other;
  };

  const saveSkillAssessment = async (skillName: string, score: number) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('skill_assessments')
        .upsert({
          user_id: userId,
          skill_name: skillName,
          score
        });

      if (error) {
        console.error('Error saving skill assessment:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected error saving skill assessment:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const questions = getQuestions();
    const allAnswered = questions.every(q => assessmentAnswers[q.id]);
    
    if (!allAnswered) {
      alert("Please answer all questions before continuing.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Save all answers to the database
      const savePromises = Object.entries(assessmentAnswers).map(
        ([skillName, score]) => saveSkillAssessment(skillName, parseInt(score))
      );
      
      await Promise.all(savePromises);
      onComplete(assessmentAnswers);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert("There was an error saving your assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {getQuestions().map((question, index) => (
        <div key={index} className="space-y-3">
          <Label>{question.text}</Label>
          <RadioGroup 
            value={assessmentAnswers[question.id] || ''} 
            onValueChange={(value) => {
              setAssessmentAnswers(prev => ({
                ...prev,
                [question.id]: value
              }));
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
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing responses...
            </>
          ) : (
            'Get Personalized Recommendations'
          )}
        </Button>
      </div>
    </div>
  );
}
