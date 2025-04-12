
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
  ChevronLeftCircle, ChevronRightCircle, BarChart
} from 'lucide-react';

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
        
        // Fetch questions for this quiz
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('sequence_order', { ascending: true });
          
        if (questionError) throw questionError;
        
        if (questionData) {
          // For each question, get its options
          const questionsWithOptions = await Promise.all(questionData.map(async (q) => {
            if (q.question_type === 'multiple_choice') {
              const { data: optionData } = await supabase
                .from('quiz_options')
                .select('*')
                .eq('question_id', q.id)
                .order('sequence_order', { ascending: true });
                
              return { ...q, options: optionData || [] };
            }
            return q;
          }));
          
          setQuestions(questionsWithOptions);
          
          // Initialize user responses
          const initialResponses = questionData.map((q) => ({
            questionId: q.id,
            selectedOptionId: undefined,
            textResponse: ''
          }));
          
          setUserResponses(initialResponses);
        }
        
        // Create a new quiz attempt
        if (profile) {
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
            handleSubmitQuiz();
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
            // For each question, get its options
            const questionsWithOptions = await Promise.all(questionData.map(async (q) => {
              if (q.question_type === 'multiple_choice') {
                const { data: optionData } = await supabase
                  .from('quiz_options')
                  .select('*')
                  .eq('question_id', q.id)
                  .order('sequence_order', { ascending: true });
                  
                return { ...q, options: optionData || [] };
              }
              return q;
            }));
            
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
        
      setQuizResult({
        totalPoints,
        earnedPoints,
        percentage,
        passed,
        questionResults
      });
      
      setQuizSubmitted(true);
      
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
  
  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = userResponses.find(r => r.questionId === currentQuestion?.id);
  const questionsAnswered = userResponses.filter(r => 
    (r.selectedOptionId && r.selectedOptionId.length > 0) || 
    (r.textResponse && r.textResponse.length > 0)
  ).length;
  
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
              
              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                <RadioGroup 
                  value={currentResponse?.selectedOptionId || ""}
                  onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 border rounded-md p-3 mb-2 hover:bg-muted/50">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="w-full cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
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
