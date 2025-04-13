import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft, Clock, CheckCircle, AlertCircle, ChevronRight,
  ChevronLeftCircle, ChevronRightCircle, BarChart, Bug
} from 'lucide-react';
import { checkUserAchievements } from '@/utils/incentivesUtils';
import { awardPoints } from '@/utils/incentivesUtils';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit: number;
  course_id: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  options?: Option[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface UserResponse {
  questionId: string;
  selectedOptionId?: string;
  textResponse?: string;
}

interface QuizResult {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  passed: boolean;
  questionResults: {
    questionId: string;
    isCorrect: boolean;
    pointsEarned: number;
  }[];
}

export default function TakeQuiz() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Derive current question and response from state
  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = userResponses.find(r => r.questionId === currentQuestion?.id);
  
  useEffect(() => {
    if (!quizId) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Check if user has already attempted this quiz
        if (profile?.id) {
          const { data: attemptData } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quizId)
            .eq('user_id', profile.id)
            .eq('completed', true)
            .maybeSingle();
            
          if (attemptData) {
            // User has already completed this quiz
            toast({
              title: "Quiz Already Completed",
              description: "You have already completed this quiz. Showing your previous results.",
              variant: "default",
            });
            
            // Fetch the result
            await fetchQuizResult(attemptData.id);
            setQuizSubmitted(true);
            setIsLoading(false);
            return;
          }
        }
        
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
          
        if (quizError) throw quizError;
        setQuiz(quizData);
        
        // Set timer if quiz has time limit
        if (quizData?.time_limit) {
          setTimeRemaining(quizData.time_limit * 60); // Convert minutes to seconds
        }
        
        // Fetch questions
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('sequence_order', { ascending: true });

        if (questionError) {
          console.error("Error fetching quiz questions:", questionError);
          throw questionError;
        }

        if (!questionData || questionData.length === 0) {
          console.warn("No questions found for quiz ID:", quizId);
          toast({
            title: "Empty Quiz",
            description: "This quiz doesn't have any questions yet.",
            variant: "destructive",
          });
          setQuestions([]);
          setIsLoading(false);
          return;
        }

        console.log(`Found ${questionData.length} questions for quiz ID: ${quizId}`);

        // Process each question and fetch its options
        const questionsWithOptionsPromises = questionData.map(async (question) => {
          try {
            console.log(`Fetching options for question ${question.id}`);
            
            // Direct SQL query for options using question_id
            const { data: optionsData, error: optionsError } = await supabase
              .from('quiz_options')
              .select('*')
              .eq('question_id', question.id)
              .limit(100);

            if (optionsError) {
              console.error(`Error fetching options for question ${question.id}:`, optionsError);
              return {
                ...question,
                options: []
              };
            }

            // Log the options we found
            console.log(`Found ${optionsData?.length || 0} options for question ${question.id}:`, optionsData);

            // If no options found for multiple choice or true/false, create default ones
            if ((!optionsData || optionsData.length === 0) && 
                (question.question_type === 'multiple_choice' || question.question_type === 'true_false')) {
              
              console.log(`Creating default options for question ${question.id} of type ${question.question_type}`);
              
              const defaultOptions = question.question_type === 'true_false' 
                ? [
                    { question_id: question.id, option_text: 'True', is_correct: true, sequence_order: 0 },
                    { question_id: question.id, option_text: 'False', is_correct: false, sequence_order: 1 }
                  ]
                : [
                    { question_id: question.id, option_text: 'Option 1', is_correct: true, sequence_order: 0 },
                    { question_id: question.id, option_text: 'Option 2', is_correct: false, sequence_order: 1 },
                    { question_id: question.id, option_text: 'Option 3', is_correct: false, sequence_order: 2 }
                  ];

              const { data: createdOptions, error: createError } = await supabase
                .from('quiz_options')
                .insert(defaultOptions)
                .select();

              if (createError) {
                console.error(`Error creating default options for question ${question.id}:`, createError);
              } else {
                console.log(`Successfully created default options for question ${question.id}:`, createdOptions);
                return {
                  ...question,
                  options: createdOptions
                };
              }
            }

            return {
              ...question,
              options: optionsData || []
            };
          } catch (err) {
            console.error(`Error processing question ${question.id}:`, err);
            return {
              ...question,
              options: []
            };
          }
        });

        try {
          const questionsWithOptions = await Promise.all(questionsWithOptionsPromises);
          console.log('Final questions with options:', questionsWithOptions);
          
          setQuestions(questionsWithOptions);
          
          // Initialize user responses
          const initialResponses = questionsWithOptions.map((q) => ({
            questionId: q.id,
            selectedOptionId: undefined,
            textResponse: ''
          }));
          
          setUserResponses(initialResponses);
        } catch (err) {
          console.error("Error processing questions with options:", err);
          toast({
            title: "Error",
            description: "Error loading quiz content. Some questions may not display correctly.",
            variant: "destructive",
          });
        }
        
        // Create a new quiz attempt
        if (profile) {
          try {
            const { data: attempt, error: attemptError } = await supabase
              .from('quiz_attempts')
              .insert({
                quiz_id: quizId,
                user_id: profile.id,
                start_time: new Date().toISOString()
              })
              .select()
              .single();
              
            if (attemptError) throw attemptError;
            setAttemptId(attempt.id);
          } catch (attemptError) {
            console.error("Error creating quiz attempt:", attemptError);
            toast({
              title: "Warning",
              description: "Failed to create quiz attempt record. Your progress may not be saved.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizId, profile]);
  
  useEffect(() => {
    // Set up timer if there's a time limit
    if (timeRemaining !== null && !quizSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            // Call handleSubmitQuiz but avoid the dependency cycle
            if (!quizSubmitted) {
              setQuizSubmitted(true);
              // Use setTimeout to break the synchronous execution
              setTimeout(() => handleSubmitQuiz(), 0);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, quizSubmitted]);
  
  const fetchQuizResult = async (attemptId: string) => {
    try {
      // Fetch quiz details if not already loaded
      if (!quiz) {
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
          
        setQuiz(quizData);
      }
      
      // Fetch quiz attempt
      const { data: attemptData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();
        
      // Fetch quiz responses
      const { data: responseData } = await supabase
        .from('quiz_responses')
        .select('*, question:question_id(*)')
        .eq('attempt_id', attemptId);
        
      if (responseData) {
        const totalPoints = responseData.reduce(
          (sum, r) => sum + (r.question?.points || 0), 
          0
        );
        const earnedPoints = responseData.reduce(
          (sum, r) => sum + (r.points_earned || 0), 
          0
        );
        const percentage = totalPoints > 0 
          ? Math.round((earnedPoints / totalPoints) * 100) 
          : 0;
          
        const quizResults: QuizResult = {
          totalPoints,
          earnedPoints,
          percentage,
          passed: percentage >= (quiz?.passing_score || 70),
          questionResults: responseData.map(r => ({
            questionId: r.question_id,
            isCorrect: r.is_correct || false,
            pointsEarned: r.points_earned || 0
          }))
        };
        
        setQuizResult(quizResults);
        setAttemptId(attemptId);
        
        // Fetch questions if needed for displaying results
        if (questions.length === 0) {
          const { data: questionData } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quizId)
            .order('sequence_order', { ascending: true });
            
          if (questionData) {
            // For each question, get options using direct SQL query
            const questionsWithOptionsPromises = questionData.map(async (question) => {
              try {
                console.log(`Fetching options for question ${question.id}`);
                
                // Direct SQL query for options as shown in the user's example
                const { data: optionsData } = await supabase
                  .from('quiz_options')
                  .select('*')
                  .eq('question_id', question.id)
                  .order('sequence_order', { ascending: true });
                  
                return {
                  ...question,
                  options: optionsData || []
                };
              } catch (err) {
                console.error(`Error fetching options for question ${question.id}:`, err);
                return {
                  ...question,
                  options: []
                };
              }
            });
            
            const questionsWithOptions = await Promise.all(questionsWithOptionsPromises);
            setQuestions(questionsWithOptions);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching quiz result:', error);
    }
  };
  
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setUserResponses(prev => 
      prev.map(response => 
        response.questionId === questionId
          ? { ...response, selectedOptionId: optionId }
          : response
      )
    );
  };
  
  const handleTextResponse = (questionId: string, text: string) => {
    setUserResponses(prev => 
      prev.map(response => 
        response.questionId === questionId
          ? { ...response, textResponse: text }
          : response
      )
    );
  };
  
  const handleSubmitQuiz = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!profile || !attemptId || !quiz) {
      toast({
        title: "Error",
        description: "Unable to submit quiz. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      let earnedPoints = 0;
      const questionResults = [];
      
      // Process each response
      for (const response of userResponses) {
        const question = questions.find(q => q.id === response.questionId);
        if (!question) continue;
        
        let isCorrect = false;
        let pointsEarned = 0;
        
        if (question.question_type === 'multiple_choice') {
          const selectedOption = question.options?.find(o => o.id === response.selectedOptionId);
          isCorrect = selectedOption?.is_correct || false;
          pointsEarned = isCorrect ? (question.points || 1) : 0;
          
          // Create response record
          await supabase.from('quiz_responses').insert({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option_id: response.selectedOptionId,
            is_correct: isCorrect,
            points_earned: pointsEarned
          });
        } else if (question.question_type === 'text' && response.textResponse) {
          // For text responses, we don't automatically grade
          await supabase.from('quiz_responses').insert({
            attempt_id: attemptId,
            question_id: question.id,
            text_response: response.textResponse,
            // These would normally be graded by an admin/instructor later
            is_correct: null,
            points_earned: 0
          });
        }
        
        earnedPoints += pointsEarned;
        questionResults.push({
          questionId: question.id,
          isCorrect,
          pointsEarned
        });
      }
      
      const percentage = Math.round((earnedPoints / totalPoints) * 100);
      const passed = percentage >= quiz.passing_score;
      
      // Update the quiz attempt
      await supabase
        .from('quiz_attempts')
        .update({
          completed: true,
          end_time: new Date().toISOString(),
          score: percentage,
          passed
        })
        .eq('id', attemptId);
        
      // Update user_quiz_results to trigger achievement checks
      await supabase.from('user_quiz_results').upsert({
        user_id: profile.id,
        quiz_id: quizId,
        course_id: courseId,
        score: percentage,
        passed: passed,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id, quiz_id' });
      
      const quizResults: QuizResult = {
        totalPoints,
        earnedPoints,
        percentage,
        passed,
        questionResults
      };
      
      setQuizResult(quizResults);
      setQuizSubmitted(true);
      
      // Award points for quiz completion
      const basePoints = passed ? 20 : 5; // Base points for completing quiz
      await awardPoints(
        profile.id,
        basePoints,
        `Completed quiz: ${quiz.title}`,
        'quiz_completion',
        quizId
      );
      
      // If it's a perfect score, award bonus points and check achievements
      if (percentage === 100) {
        // Award bonus points for perfect score
        await awardPoints(
          profile.id,
          50, // Bonus points for perfect score
          'Perfect score bonus!',
          'perfect_quiz',
          quizId
        );
        
        toast({
          title: 'Perfect Score! 🎯',
          description: "You've earned 50 bonus points for a perfect score!",
          variant: "default",
        });
      }
      
      // Update course progress and check achievements
      await updateCourseProgress(passed);
      
      // Check achievements after all updates are done
      const { success, error } = await checkUserAchievements(profile.id);
      if (!success) {
        console.error('Error checking achievements after quiz completion:', error);
      }
      
      // Show appropriate toast message
      toast({
        title: passed ? 'Quiz Completed! 🎉' : 'Quiz Submitted',
        description: passed 
          ? `Congratulations! You passed with ${percentage}%` 
          : `You scored ${percentage}%. Required: ${quiz.passing_score}%`,
        variant: passed ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const updateCourseProgress = async (quizPassed: boolean) => {
    if (!profile || !courseId) return;
    
    try {
      // If quiz was passed, mark it in user_quiz_results
      if (quizPassed && quizResult) {
        await supabase.from('user_quiz_results').upsert({
          user_id: profile.id,
          quiz_id: quizId,
          course_id: courseId,
          score: quizResult.percentage,
          passed: true,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id, quiz_id' });
      }
      
      // Get all completed quizzes for this course
      const { data: userQuizzesData } = await supabase
        .from('user_quiz_results')
        .select('quiz_id')
        .eq('user_id', profile.id)
        .eq('course_id', courseId)
        .eq('passed', true);
        
      // Get all quizzes for this course
      const { data: courseQuizzes } = await supabase
        .from('quizzes')
        .select('id')
        .eq('course_id', courseId);
        
      // Get all lessons for this course
      const { data: courseLessons } = await supabase
        .from('course_lessons')
        .select('id')
        .eq('course_id', courseId);
        
      // Get all completed lessons for this course
      const { data: userLessonsData } = await supabase
        .from('user_lessons')
        .select('lesson_id')
        .eq('user_id', profile.id)
        .eq('completed', true);
        
      // Calculate progress based on completed items
      const totalItems = (courseQuizzes?.length || 0) + (courseLessons?.length || 0);
      const completedQuizzes = userQuizzesData?.filter(uq => 
        courseQuizzes?.some(cq => cq.id === uq.quiz_id)
      ) || [];
      const completedLessons = userLessonsData?.filter(ul => 
        courseLessons?.some(cl => cl.id === ul.lesson_id)
      ) || [];
      
      const completedItems = completedQuizzes.length + completedLessons.length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      const isComplete = progress === 100;
      
      // Update user_courses table
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: profile.id,
          course_id: courseId,
          progress: progress,
          completed: isComplete,
          last_accessed: new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null
        }, { onConflict: 'user_id, course_id' });
        
      if (error) throw error;
      
      // If course is completed, check achievements and award points
      if (isComplete) {
        try {
          // Award points for course completion 
          const { success: pointsSuccess, error: pointsError } = await awardPoints(
            profile.id,
            100, // Points for course completion
            'Completed course',
            'course_completion',
            courseId
          );
          
          if (!pointsSuccess) {
            console.error('Error awarding points for course completion:', pointsError);
          } else {
            toast({
              title: 'Points Awarded! 🎉',
              description: "You've earned 100 points for completing this course!",
              variant: "default",
            });
          }
          
          // Check for achievements
          const { success, error: achievementError } = await checkUserAchievements(profile.id);
          if (!success) {
            console.error('Error checking achievements:', achievementError);
          } else {
            toast({
              title: 'Course Completed! 🎉',
              description: 'You may have unlocked new achievements. Check your profile!',
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Error processing completion rewards:', error);
        }
      }
    } catch (error) {
      console.error('Error updating course progress:', error);
      toast({
        title: "Error",
        description: "Failed to update course progress. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Add this debug function to the component to verify SQL fix worked
  const verifyQuizFix = async () => {
    if (profile?.role !== 'admin') return;

    try {
      // Check if the view we created exists
      const { data: viewCheck, error: viewError } = await supabase.rpc(
        'has_table_or_view',
        { table_name: 'vw_quiz_questions_with_options' }
      );

      if (viewError) {
        toast({
          title: "Database Check",
          description: "Could not verify SQL fix: " + viewError.message,
          variant: "destructive",
        });
        return;
      }

      // Use our custom view to check for questions without options
      const { data, error } = await supabase
        .from('vw_quiz_questions_with_options')
        .select('question_id, question_text, question_type, option_count')
        .eq('question_id', questions[0]?.id)
        .single();

      if (error) {
        toast({
          title: "SQL Fix Verification",
          description: "Error checking fix: " + error.message,
          variant: "destructive",
        });
      } else if (data) {
        // Show the result
        toast({
          title: "SQL Fix Verification",
          description: `Question "${data.question_text?.substring(0, 20)}..." has ${data.option_count} options`,
          variant: data.option_count > 0 ? "default" : "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying SQL fix:", error);
      toast({
        title: "Error",
        description: "Could not verify SQL fix",
        variant: "destructive",
      });
    }
  };

  // Add a check to the top of the component to verify options after loading
  useEffect(() => {
    if (questions.length > 0 && !isLoading) {
      // Check if first question has options
      const firstQuestion = questions[0];
      if (firstQuestion && (!firstQuestion.options || firstQuestion.options.length === 0)) {
        // Show warning if no options found
        toast({
          title: "Missing Quiz Options",
          description: "This quiz has questions without options. Try clicking 'Verify SQL Fix'",
          variant: "destructive",
        });
      } else {
        console.log("Quiz options verification passed!");
      }
    }
  }, [questions, isLoading]);
  
  // Add a manual fix function for the admin
  const manuallyFixCurrentQuestion = async () => {
    if (profile?.role !== 'admin' || !questions[currentQuestionIndex]) return;
    
    try {
      toast({
        title: "Fixing Options",
        description: "Attempting to fix options for current question...",
      });
      
      // Insert default options for the current question
      if (questions[currentQuestionIndex].question_type === 'multiple_choice') {
        // Create 3 default options for multiple choice
        const { error } = await supabase
          .from('quiz_options')
          .insert([
            { 
              question_id: questions[currentQuestionIndex].id, 
              option_text: 'Option 1 (Created Manually)',
              is_correct: true,
              sequence_order: 0
            },
            { 
              question_id: questions[currentQuestionIndex].id, 
              option_text: 'Option 2 (Created Manually)',
              is_correct: false,
              sequence_order: 1
            },
            { 
              question_id: questions[currentQuestionIndex].id, 
              option_text: 'Option 3 (Created Manually)',
              is_correct: false,
              sequence_order: 2
            }
          ]);
          
        if (error) {
          console.error('Error creating options:', error);
          toast({
            title: "Error",
            description: "Failed to create options: " + error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Options created. Refreshing...",
          });
          
          // Refresh the questions data
          window.location.reload();
        }
      } else if (questions[currentQuestionIndex].question_type === 'true_false') {
        // Create true/false options
        const { error } = await supabase
          .from('quiz_options')
          .insert([
            { 
              question_id: questions[currentQuestionIndex].id, 
              option_text: 'True',
              is_correct: true,
              sequence_order: 0
            },
            { 
              question_id: questions[currentQuestionIndex].id, 
              option_text: 'False',
              is_correct: false,
              sequence_order: 1
            }
          ]);
          
        if (error) {
          console.error('Error creating options:', error);
          toast({
            title: "Error",
            description: "Failed to create options: " + error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Options created. Refreshing...",
          });
          
          // Refresh the questions data
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error manually fixing options:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Add a specific fix function for the troublesome question IDs
  const fixSpecificQuestionOptions = async () => {
    if (profile?.role !== 'admin') return;
    
    const problematicIds = [
      'c5762c9c-96d3-410b-b2e3-d2c99c3459dc',
      'a57ee966-0446-4b5e-a85d-871d9130a985'
    ];
    
    try {
      toast({
        title: "Direct Fix",
        description: "Attempting to fix options for problematic questions...",
      });
      
      // Loop through and try to fix each problematic ID
      for (const questionId of problematicIds) {
        // Check for existing options first
        const { data: existingOptions } = await supabase
          .from('quiz_options')
          .select('id')
          .eq('question_id', questionId);
          
        if (existingOptions && existingOptions.length > 0) {
          console.log(`Question ${questionId} already has ${existingOptions.length} options, skipping`);
          continue;
        }
        
        console.log(`Fixing options for question ${questionId}`);
        
        // Try to get the question to determine its type
        const { data: questionData } = await supabase
          .from('quiz_questions')
          .select('question_type')
          .eq('id', questionId)
          .single();
          
        if (!questionData) {
          console.error(`Question ${questionId} not found`);
          continue;
        }
        
        if (questionData.question_type === 'multiple_choice') {
          const { error } = await supabase
            .from('quiz_options')
            .insert([
              { question_id: questionId, option_text: 'First', is_correct: false, sequence_order: 0 },
              { question_id: questionId, option_text: 'Second', is_correct: true, sequence_order: 1 },
              { question_id: questionId, option_text: 'Third', is_correct: false, sequence_order: 2 }
            ]);
            
          if (error) {
            console.error(`Error creating options for ${questionId}:`, error);
          } else {
            console.log(`Successfully created options for ${questionId}`);
          }
        } else if (questionData.question_type === 'true_false') {
          const { error } = await supabase
            .from('quiz_options')
            .insert([
              { question_id: questionId, option_text: 'True', is_correct: true, sequence_order: 0 },
              { question_id: questionId, option_text: 'False', is_correct: false, sequence_order: 1 }
            ]);
            
          if (error) {
            console.error(`Error creating options for ${questionId}:`, error);
          } else {
            console.log(`Successfully created options for ${questionId}`);
          }
        }
      }
      
      toast({
        title: "Fix Attempted",
        description: "Direct fixes applied. Refreshing the page...",
      });
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error fixing specific questions:', error);
      toast({
        title: "Error",
        description: "An error occurred while fixing specific questions",
        variant: "destructive",
      });
    }
  };
  
  // Update the logCurrentQuestionOptions function
  const logCurrentQuestionOptions = async () => {
    const questionToCheck = questions[currentQuestionIndex];
    if (!questionToCheck) return;
    
    toast({
      title: "Debug Info",
      description: `Checking options for question ID: ${questionToCheck.id}`,
    });
    
    try {
      console.log(`Fetching options for question ${questionToCheck.id}`);
      
      // Direct SQL query for options as shown in the user's example
      const { data: optionsData, error } = await supabase
        .from('quiz_options')
        .select('*')
        .eq('question_id', questionToCheck.id)
        .order('sequence_order', { ascending: true });
      
      if (error) {
        console.error(`Error fetching options for question ${questionToCheck.id}:`, error);
        toast({
          title: "Error",
          description: "Failed to fetch options. See console for details.",
          variant: "destructive",
        });
        return;
      }
      
      if (!optionsData || optionsData.length === 0) {
        toast({
          title: "No Options Found",
          description: "This question has no options in the database.",
          variant: "destructive",
        });
      } else {
        console.log(`Options for question ${questionToCheck.id}:`, optionsData);
        toast({
          title: "Options Found",
          description: `Found ${optionsData.length} options. See console for details.`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error(`Error fetching options:`, err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. See console for details.",
        variant: "destructive",
      });
    }
  };
  
  // Add a function to check quiz options via direct SQL
  const checkQuizOptionsViaSQL = async () => {
    const questionToCheck = questions[currentQuestionIndex];
    if (!questionToCheck) return;
    
    toast({
      title: "Database Check",
      description: `Checking options in database for question ID: ${questionToCheck.id}`,
    });
    
    try {
      // Direct SQL query for options
      const { data, error } = await supabase
        .from('quiz_options')
        .select('*')
        .eq('question_id', questionToCheck.id)
        .order('sequence_order', { ascending: true });
      
      if (error) {
        console.error('SQL query error:', error);
        toast({
          title: "Database Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      // Log and display results
      console.log('Database options response:', data);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Options in Database",
          description: "This question has no options in the database.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Database Options Found",
          description: `Found ${data.length} options in the database. See console for details.`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error('Error checking options via SQL:', err);
      toast({
        title: "Query Error",
        description: "Error executing database query. See console.",
        variant: "destructive",
      });
    }
  };
  
  // Add this function after the other debug functions
  const verifyOptionsLoaded = async () => {
    if (!questions || questions.length === 0) {
      toast({
        title: "No Questions Found",
        description: "There are no questions loaded to verify.",
        variant: "destructive",
      });
      return;
    }

    console.log("Verifying options for all questions:", questions);
    
    let hasIssues = false;
    for (const question of questions) {
      console.log(`Question ${question.id}:`, {
        text: question.question_text,
        type: question.question_type,
        options: question.options
      });

      if (!question.options || question.options.length === 0) {
        hasIssues = true;
        console.error(`Missing options for question ${question.id}`);
        
        // Try to fetch options directly from database
        const { data: optionsData, error: optionsError } = await supabase
          .from('quiz_options')
          .select('*')
          .eq('question_id', question.id);

        if (optionsError) {
          console.error(`Failed to fetch options for question ${question.id}:`, optionsError);
        } else {
          console.log(`Found ${optionsData.length} options in database for question ${question.id}:`, optionsData);
        }
      }
    }

    toast({
      title: hasIssues ? "Issues Found" : "Verification Complete",
      description: hasIssues 
        ? "Some questions are missing options. Check console for details."
        : "All questions have their options loaded correctly.",
      variant: hasIssues ? "destructive" : "default",
    });
  };
  
  // Remove redundant declarations here and use the derived values above
  const questionsAnswered = userResponses.filter(r => 
    (r.selectedOptionId && r.selectedOptionId.length > 0) || 
    (r.textResponse && r.textResponse.length > 0)
  ).length;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (quizSubmitted && quizResult) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/courses/${courseId}/lessons`)} 
          className="mb-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Course
        </Button>
        
        <Card className="mb-8">
          <CardHeader className="bg-muted/50">
            <CardTitle>{quiz?.title}</CardTitle>
            <CardDescription>{quiz?.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-6">
              {quizResult.passed ? (
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-4 inline-block mb-4">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-2">Quiz Passed!</h2>
                  <p className="text-muted-foreground">
                    Congratulations on successfully completing this quiz.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-red-100 rounded-full p-4 inline-block mb-4">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">Not Passed</h2>
                  <p className="text-muted-foreground">
                    You didn't meet the passing score. You can review and try again.
                  </p>
                </div>
              )}
              
              <div className="w-full max-w-md mt-8">
                <div className="flex justify-between text-sm mb-2">
                  <span>Your Score</span>
                  <span className="font-medium">{quizResult.percentage}%</span>
                </div>
                <Progress 
                  value={quizResult.percentage} 
                  className={`h-3 ${quizResult.passed ? 'bg-green-200' : 'bg-red-200'}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>Passing: {quiz?.passing_score || 70}%</span>
                  <span>100%</span>
                </div>
                
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Points earned:</span>
                    <span className="font-medium">
                      {quizResult.earnedPoints} / {quizResult.totalPoints}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Questions correct:</span>
                    <span className="font-medium">
                      {quizResult.questionResults.filter(r => r.isCorrect).length} / {quizResult.questionResults.length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/courses/${courseId}/lessons`)}
                >
                  Return to Course
                </Button>
                <Button onClick={() => setQuizSubmitted(false)}>
                  <BarChart className="mr-2 h-4 w-4" />
                  Review Questions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {!quizSubmitted && quizResult && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Question Review</h2>
            {questions.map((question, idx) => {
              const response = userResponses.find(r => r.questionId === question.id);
              const result = quizResult.questionResults.find(r => r.questionId === question.id);
              
              return (
                <Card key={question.id} className={`border-l-4 ${
                  result?.isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {idx + 1}. {question.question_text}
                    </CardTitle>
                    <CardDescription>
                      {result?.isCorrect ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Correct
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Incorrect
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-3">
                        {question.options.map((option) => {
                          const isSelected = response?.selectedOptionId === option.id;
                          let optionClass = 'border rounded-md p-3 flex items-center';
                          
                          if (option.is_correct) {
                            optionClass += ' border-green-500 bg-green-50';
                          } else if (isSelected && !option.is_correct) {
                            optionClass += ' border-red-500 bg-red-50';
                          }
                          
                          return (
                            <div key={option.id} className={optionClass}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                                option.is_correct 
                                  ? 'bg-green-500 text-white' 
                                  : isSelected ? 'bg-red-500 text-white' : 'bg-gray-100'
                              }`}>
                                {option.is_correct && <CheckCircle className="h-3 w-3" />}
                                {isSelected && !option.is_correct && <AlertCircle className="h-3 w-3" />}
                              </div>
                              <span>{option.option_text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {question.question_type === 'text' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Your answer:</p>
                        <div className="border rounded-md p-3 bg-muted/30">
                          {response?.textResponse || 'No answer provided'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <CardTitle>{quiz?.title}</CardTitle>
              <CardDescription className="mt-1">{quiz?.description}</CardDescription>
            </div>
            
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-muted'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{currentQuestionIndex + 1} of {questions.length}</span>
            </div>
            <Progress value={(currentQuestionIndex + 1) / questions.length * 100} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent>
          {currentQuestion && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{quiz?.title}</h2>
                {profile?.role === 'admin' && (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={verifyQuizFix} variant="outline" size="sm">
                      Verify SQL Fix
                    </Button>
                    <Button onClick={fixSpecificQuestionOptions} variant="secondary" size="sm">
                      Fix Known Questions
                    </Button>
                    <Button onClick={logCurrentQuestionOptions} variant="ghost" size="sm">
                      <Bug className="mr-1 h-3 w-3" /> Log Options
                    </Button>
                    <Button onClick={checkQuizOptionsViaSQL} variant="ghost" size="sm">
                      DB Check
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={verifyOptionsLoaded}
                      className="flex items-center gap-2"
                    >
                      <Bug className="h-4 w-4" />
                      Verify Options
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {currentQuestionIndex + 1}. {currentQuestion.question_text}
                </h3>
                {currentQuestion.points > 1 && (
                  <p className="text-sm text-muted-foreground">
                    This question is worth {currentQuestion.points} points
                  </p>
                )}
              </div>
              
              {currentQuestion.question_type === 'multiple_choice' && (
                <RadioGroup 
                  value={currentResponse?.selectedOptionId || ""}
                  onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
                >
                  {currentQuestion.options && currentQuestion.options.length > 0 ? (
                    currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 border rounded-md p-3 mb-2 hover:bg-muted/50">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="w-full cursor-pointer">
                          {option.option_text}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-muted-foreground">No options available for this question.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Please contact an administrator to fix this quiz.
                      </p>
                    </div>
                  )}
                </RadioGroup>
              )}
              
              {currentQuestion.question_type === 'text' && (
                <Textarea
                  placeholder="Type your answer here..."
                  value={currentResponse?.textResponse || ''}
                  onChange={(e) => handleTextResponse(currentQuestion.id, e.target.value)}
                  rows={5}
                  className="w-full"
                />
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4 border-t">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={goToPrevQuestion} 
              disabled={currentQuestionIndex === 0} 
              className="w-full sm:w-auto"
            >
              <ChevronLeftCircle className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button 
                onClick={goToNextQuestion} 
                className="w-full sm:w-auto"
              >
                Next
                <ChevronRightCircle className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    Submit Quiz
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Quiz</AlertDialogTitle>
                    <AlertDialogDescription>
                      You've answered {questionsAnswered} out of {questions.length} questions.
                      {questionsAnswered < questions.length && (
                        <span className="block mt-2 text-amber-600">
                          Warning: You have {questions.length - questionsAnswered} unanswered questions.
                        </span>
                      )}
                      Are you sure you want to submit this quiz? You cannot change your answers after submission.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitQuiz}>
                      Submit Quiz
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <span>{questionsAnswered} of {questions.length} questions answered</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
