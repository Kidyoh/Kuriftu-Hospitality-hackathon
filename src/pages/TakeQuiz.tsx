
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Timer, AlertCircle } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  lesson_id: string | null;
  passing_score: number | null;
  time_limit: number | null;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  points: number;
  options: QuestionOption[];
}

interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

interface UserResponse {
  questionId: string;
  selectedOptions: string[];
  points: number;
  isCorrect: boolean;
}

export default function TakeQuiz() {
  const { quizId, courseId, lessonId } = useParams<{ quizId: string, courseId: string, lessonId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizAttemptId, setQuizAttemptId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isPassing, setIsPassing] = useState<boolean | null>(null);
  
  const currentQuestion = questions[currentQuestionIndex];
  
  useEffect(() => {
    if (user && quizId) {
      loadQuizDetails();
    } else {
      navigate('/dashboard');
      toast({
        title: "Access Denied",
        description: "You need to be logged in to take a quiz.",
        variant: "destructive"
      });
    }
  }, [user, quizId, navigate]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (quizStarted && timeRemaining !== null && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev !== null ? prev - 1 : null);
      }, 1000);
    } else if (timeRemaining === 0) {
      handleSubmitQuiz();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [quizStarted, timeRemaining]);
  
  const loadQuizDetails = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has already attempted this quiz
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user!.id)
        .eq('completed', true)
        .maybeSingle();
        
      if (attemptError) throw attemptError;
      
      if (attemptData) {
        // User has already completed this quiz
        toast({
          title: "Quiz Already Taken",
          description: "You have already completed this quiz.",
          variant: "default"
        });
        // Navigate to result page or dashboard
        navigate(`/courses/${courseId}${lessonId ? `/lessons/${lessonId}` : ''}`);
        return;
      }
      
      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
        
      if (quizError) throw quizError;
      setQuiz(quizData);
      setTimeRemaining(quizData.time_limit ? quizData.time_limit * 60 : null);
      
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sequence_order', { ascending: true });
        
      if (questionsError) throw questionsError;
      
      if (questionsData && questionsData.length > 0) {
        // Fetch options for all questions
        const questionIds = questionsData.map(q => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from('quiz_options')
          .select('*')
          .in('question_id', questionIds)
          .order('sequence_order', { ascending: true });
          
        if (optionsError) throw optionsError;
        
        // Combine questions with their options
        const questionsWithOptions = questionsData.map(question => {
          const options = optionsData?.filter(option => option.question_id === question.id) || [];
          return { ...question, options };
        });
        
        setQuestions(questionsWithOptions);
        
        // Initialize user responses
        const initialResponses = questionsWithOptions.map(q => ({
          questionId: q.id,
          selectedOptions: [],
          points: 0,
          isCorrect: false
        }));
        
        setUserResponses(initialResponses);
      } else {
        toast({
          title: "No Questions Found",
          description: "This quiz doesn't have any questions yet.",
          variant: "destructive"
        });
        navigate(`/courses/${courseId}${lessonId ? `/lessons/${lessonId}` : ''}`);
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const startQuiz = async () => {
    try {
      // Create a new quiz attempt
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user!.id,
          start_time: new Date().toISOString(),
          completed: false
        })
        .select();
        
      if (error) throw error;
      
      setQuizAttemptId(data![0].id);
      setQuizStarted(true);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to start quiz. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleOptionSelect = (optionId: string, isMultipleAnswer: boolean) => {
    setUserResponses(prev => {
      return prev.map((response, idx) => {
        if (idx === currentQuestionIndex) {
          let selectedOptions;
          
          if (isMultipleAnswer) {
            // Toggle the option in or out for multiple answer questions
            selectedOptions = response.selectedOptions.includes(optionId)
              ? response.selectedOptions.filter(id => id !== optionId)
              : [...response.selectedOptions, optionId];
          } else {
            // Replace selection for single answer questions
            selectedOptions = [optionId];
          }
          
          return { ...response, selectedOptions };
        }
        return response;
      });
    });
  };
  
  const navigateQuestion = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const calculateScore = () => {
    // Prepare the responses with correct/incorrect evaluation and points
    const processedResponses = userResponses.map((response, index) => {
      const question = questions[index];
      
      // Get all correct options for this question
      const correctOptionIds = question.options
        .filter(option => option.is_correct)
        .map(option => option.id);
      
      // For single answer questions, check if the selected option is correct
      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        // For single answer questions, they get full points or none
        const isCorrect = response.selectedOptions.length === 1 && 
                          correctOptionIds.includes(response.selectedOptions[0]);
        const points = isCorrect ? question.points : 0;
        
        return { ...response, isCorrect, points };
      } 
      // For multiple answer questions, calculate partial credit
      else if (question.question_type === 'multiple_answer') {
        // Count correctly selected options and incorrectly selected options
        const correctSelections = response.selectedOptions.filter(id => correctOptionIds.includes(id));
        const incorrectSelections = response.selectedOptions.filter(id => !correctOptionIds.includes(id));
        
        // Perfect score only if all correct options are selected and no incorrect ones
        const isCorrect = correctSelections.length === correctOptionIds.length && 
                          incorrectSelections.length === 0;
        
        // For partial credit: each correct selection is worth a portion of the points
        // For each incorrect selection, subtract a portion
        let points = 0;
        
        if (correctOptionIds.length > 0) {
          // Points per correct option
          const pointPerOption = question.points / correctOptionIds.length;
          points = correctSelections.length * pointPerOption;
          
          // Penalty for incorrect selections (up to zeroing out the score)
          const penalty = incorrectSelections.length * pointPerOption;
          points = Math.max(0, points - penalty);
        }
        
        return { ...response, isCorrect, points: Math.round(points * 100) / 100 };
      }
      
      return response;
    });
    
    // Calculate total score
    const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0);
    const totalEarnedPoints = processedResponses.reduce((sum, r) => sum + r.points, 0);
    
    const scorePercentage = totalPossiblePoints > 0 
      ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100) 
      : 0;
    
    const isPassing = scorePercentage >= (quiz?.passing_score || 70);
    
    return {
      processedResponses,
      scorePercentage,
      totalEarnedPoints,
      totalPossiblePoints,
      isPassing
    };
  };
  
  const handleSubmitQuiz = async () => {
    if (!quizAttemptId) return;
    
    try {
      const {
        processedResponses,
        scorePercentage,
        totalEarnedPoints,
        totalPossiblePoints,
        isPassing
      } = calculateScore();
      
      // Update the quiz attempt
      const { error: attemptError } = await supabase
        .from('quiz_attempts')
        .update({
          completed: true,
          end_time: new Date().toISOString(),
          score: scorePercentage,
          passed: isPassing
        })
        .eq('id', quizAttemptId);
        
      if (attemptError) throw attemptError;
      
      // Save individual responses
      const responsesToSave = processedResponses.map(response => ({
        attempt_id: quizAttemptId,
        question_id: response.questionId,
        selected_option_id: response.selectedOptions.length > 0 ? response.selectedOptions[0] : null,
        is_correct: response.isCorrect,
        points_earned: response.points
      }));
      
      const { error: responsesError } = await supabase
        .from('quiz_responses')
        .insert(responsesToSave);
        
      if (responsesError) throw responsesError;
      
      setQuizScore(scorePercentage);
      setIsPassing(isPassing);
      setQuizCompleted(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card className="w-full p-6">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    );
  }
  
  if (quizCompleted) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">{quiz?.title} - Results</CardTitle>
            <CardDescription>Quiz completed</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col items-center space-y-6 py-6">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{quizScore}%</div>
                <div className={`text-lg ${isPassing ? 'text-green-600' : 'text-red-600'}`}>
                  {isPassing ? 'Passed! 🎉' : 'Not passed. Please try again.'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Passing score: {quiz?.passing_score || 70}%
                </div>
              </div>
              
              <Progress value={quizScore} className="h-3 w-full max-w-md" />
              
              <div className="bg-muted p-4 rounded-md w-full max-w-md">
                <h3 className="font-medium mb-2">Quiz Summary</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span>Total Questions:</span>
                    <span>{questions.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Correct Answers:</span>
                    <span>
                      {userResponses.filter(r => r.isCorrect).length} of {questions.length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Time Taken:</span>
                    <span>
                      {timeRemaining !== null
                        ? `${formatTime((quiz?.time_limit || 30) * 60 - timeRemaining)}`
                        : 'N/A'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => navigate(`/courses/${courseId}${lessonId ? `/lessons/${lessonId}` : ''}`)}
              >
                Return to Course
              </Button>
              
              {!isPassing && (
                <Button onClick={() => window.location.reload()}>
                  Retry Quiz
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!quizStarted) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">{quiz?.title}</CardTitle>
            <CardDescription>{quiz?.description}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Quiz Information</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span>Number of Questions:</span>
                    <span>{questions.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Time Limit:</span>
                    <span>{quiz?.time_limit ? `${quiz.time_limit} minutes` : 'No time limit'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Passing Score:</span>
                    <span>{quiz?.passing_score || 70}%</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-800 dark:text-yellow-200 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Before you begin</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Once started, you cannot pause the quiz. Make sure you have enough time to complete it.
                      {quiz?.time_limit ? ` You will have ${quiz.time_limit} minutes to submit your answers.` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => navigate(`/courses/${courseId}${lessonId ? `/lessons/${lessonId}` : ''}`)}
              >
                Cancel
              </Button>
              <Button onClick={startQuiz}>Start Quiz</Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">{quiz?.title}</CardTitle>
            {timeRemaining !== null && (
              <div className="flex items-center text-orange-600 font-medium">
                <Timer className="h-4 w-4 mr-1" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <CardDescription>Question {currentQuestionIndex + 1} of {questions.length}</CardDescription>
            <div className="text-sm text-muted-foreground">
              Points: {currentQuestion?.points || 0}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Progress 
            value={((currentQuestionIndex + 1) / questions.length) * 100} 
            className="h-2 mb-6" 
          />
          
          {currentQuestion && (
            <div className="space-y-6">
              <div className="text-lg font-medium">
                {currentQuestion.question_text}
              </div>
              
              <div className="space-y-3">
                {currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false' ? (
                  <RadioGroup
                    value={userResponses[currentQuestionIndex]?.selectedOptions[0] || ''}
                    onValueChange={(value) => handleOptionSelect(value, false)}
                    className="space-y-2"
                  >
                    {currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 border p-3 rounded-md">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-grow cursor-pointer">
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 border p-3 rounded-md">
                        <Checkbox
                          id={option.id}
                          checked={userResponses[currentQuestionIndex]?.selectedOptions.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) handleOptionSelect(option.id, true);
                            else handleOptionSelect(option.id, true);
                          }}
                        />
                        <Label htmlFor={option.id} className="flex-grow cursor-pointer">
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => navigateQuestion('prev')}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={() => navigateQuestion('next')}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmitQuiz}>
                Submit Quiz
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
