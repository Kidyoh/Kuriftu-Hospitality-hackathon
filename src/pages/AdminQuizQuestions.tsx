
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, MoreHorizontal, Edit, Trash2, Check, X, MoveUp, MoveDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  points: number;
  sequence_order: number;
  options?: QuestionOption[];
}

interface QuestionOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
}

interface Quiz {
  id: string;
  title: string;
  course_id: string | null;
  lesson_id: string | null;
}

export default function AdminQuizQuestions() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    quiz_id: quizId,
    question_text: '',
    question_type: 'multiple_choice',
    points: 1,
    sequence_order: 0,
    options: [
      { option_text: '', is_correct: false, sequence_order: 0 },
      { option_text: '', is_correct: false, sequence_order: 1 }
    ]
  });
  
  useEffect(() => {
    if (profile && profile.role === 'admin' && quizId && courseId) {
      loadQuizDetails();
      loadQuestions();
    } else {
      navigate('/dashboard');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
    }
  }, [profile, quizId, courseId, navigate]);
  
  const loadQuizDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, course_id, lesson_id')
        .eq('id', quizId)
        .single();
        
      if (error) throw error;
      setQuiz(data);
    } catch (error) {
      console.error('Error fetching quiz details:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz details.",
        variant: "destructive"
      });
    }
  };
  
  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      // First, fetch all questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sequence_order', { ascending: true });
        
      if (questionsError) throw questionsError;
      
      if (questionsData && questionsData.length > 0) {
        // Then, fetch all options for these questions
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
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setCurrentQuestion({
      quiz_id: quizId,
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      sequence_order: questions.length,
      options: [
        { option_text: '', is_correct: false, sequence_order: 0 },
        { option_text: '', is_correct: false, sequence_order: 1 }
      ]
    });
  };
  
  const handleEditQuestion = (question: Question) => {
    setCurrentQuestion({
      ...question,
      options: question.options || []
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };
  
  const addOption = () => {
    if (!currentQuestion.options) return;
    
    setCurrentQuestion({
      ...currentQuestion,
      options: [
        ...currentQuestion.options,
        { 
          option_text: '', 
          is_correct: false, 
          sequence_order: currentQuestion.options.length 
        }
      ]
    });
  };
  
  const removeOption = (index: number) => {
    if (!currentQuestion.options) return;
    
    const updatedOptions = [...currentQuestion.options];
    updatedOptions.splice(index, 1);
    
    // Re-number the sequence_order values
    updatedOptions.forEach((option, idx) => {
      option.sequence_order = idx;
    });
    
    setCurrentQuestion({
      ...currentQuestion,
      options: updatedOptions
    });
  };
  
  const updateOption = (index: number, field: keyof QuestionOption, value: any) => {
    if (!currentQuestion.options) return;
    
    const updatedOptions = [...currentQuestion.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };
    
    // If marking this option as correct and it's multiple choice,
    // ensure other options are marked as incorrect
    if (field === 'is_correct' && value === true && currentQuestion.question_type === 'multiple_choice') {
      updatedOptions.forEach((option, idx) => {
        if (idx !== index) {
          option.is_correct = false;
        }
      });
    }
    
    setCurrentQuestion({
      ...currentQuestion,
      options: updatedOptions
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentQuestion.question_text) {
      toast({
        title: "Missing Information",
        description: "Please provide a question text.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestion.options && currentQuestion.options.some(o => !o.option_text)) {
      toast({
        title: "Missing Information",
        description: "All options must have text.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestion.question_type === 'multiple_choice' && 
        currentQuestion.options && 
        !currentQuestion.options.some(o => o.is_correct)) {
      toast({
        title: "Missing Information",
        description: "At least one option must be marked as correct.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let questionId = currentQuestion.id;
      
      // Insert or update the question
      if (isEditing && questionId) {
        // Update existing question
        const { error: questionError } = await supabase
          .from('quiz_questions')
          .update({
            question_text: currentQuestion.question_text,
            question_type: currentQuestion.question_type,
            points: currentQuestion.points
          })
          .eq('id', questionId);
          
        if (questionError) throw questionError;
        
        // Delete existing options and insert new ones
        const { error: deleteError } = await supabase
          .from('quiz_options')
          .delete()
          .eq('question_id', questionId);
          
        if (deleteError) throw deleteError;
        
        // Insert new options
        if (currentQuestion.options && currentQuestion.options.length > 0) {
          const optionsToInsert = currentQuestion.options.map(option => ({
            question_id: questionId,
            option_text: option.option_text,
            is_correct: option.is_correct,
            sequence_order: option.sequence_order
          }));
          
          const { error: optionsError } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert);
            
          if (optionsError) throw optionsError;
        }
        
        toast({
          title: "Question Updated",
          description: "The question has been successfully updated."
        });
      } else {
        // Insert new question
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizId,
            question_text: currentQuestion.question_text,
            question_type: currentQuestion.question_type,
            points: currentQuestion.points,
            sequence_order: currentQuestion.sequence_order || questions.length
          })
          .select();
          
        if (questionError) throw questionError;
        
        questionId = questionData![0].id;
        
        // Insert options
        if (currentQuestion.options && currentQuestion.options.length > 0) {
          const optionsToInsert = currentQuestion.options.map(option => ({
            question_id: questionId,
            option_text: option.option_text,
            is_correct: option.is_correct,
            sequence_order: option.sequence_order
          }));
          
          const { error: optionsError } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert);
            
          if (optionsError) throw optionsError;
        }
        
        toast({
          title: "Question Created",
          description: "A new question has been successfully created."
        });
      }
      
      loadQuestions();
      handleDialogClose();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteQuestion = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this question? This action cannot be undone.");
    
    if (!confirmed) return;
    
    try {
      // First delete all options for this question
      const { error: optionsError } = await supabase
        .from('quiz_options')
        .delete()
        .eq('question_id', id);
        
      if (optionsError) throw optionsError;
      
      // Then delete the question
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Question Deleted",
        description: "The question has been successfully deleted."
      });
      
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive"
      });
    }
  };
  
  const moveQuestion = async (question: Question, direction: 'up' | 'down') => {
    // Find the question before or after this one
    const currentIndex = questions.findIndex(q => q.id === question.id);
    let targetIndex;
    
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < questions.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      return; // Can't move any further
    }
    
    // Get target question
    const targetQuestion = questions[targetIndex];
    
    // Swap sequence orders
    try {
      const updates = [
        {
          id: question.id,
          sequence_order: targetQuestion.sequence_order
        },
        {
          id: targetQuestion.id,
          sequence_order: question.sequence_order
        }
      ];
      
      // Update both questions
      for (const update of updates) {
        const { error } = await supabase
          .from('quiz_questions')
          .update({ sequence_order: update.sequence_order })
          .eq('id', update.id);
          
        if (error) {
          throw error;
        }
      }
      
      toast({
        title: "Order Updated",
        description: "The question order has been updated."
      });
      
      loadQuestions();
    } catch (error) {
      console.error('Error updating question order:', error);
      toast({
        title: "Error",
        description: "Failed to update question order.",
        variant: "destructive"
      });
    }
  };
  
  const getBackNavigationUrl = () => {
    // If the quiz is related to a lesson
    if (quiz?.lesson_id) {
      return `/admin/courses/${courseId}/lessons/${quiz.lesson_id}/quizzes`;
    } else {
      // If it's a course-level quiz
      return `/admin/courses/${courseId}/quizzes`;
    }
  };

  return (
    <div className="container py-8">
      <Button 
        variant="outline" 
        onClick={() => navigate(getBackNavigationUrl())}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> 
        Back to Quizzes
      </Button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Questions for Quiz: {quiz?.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage questions for this quiz
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Question" : "Create New Question"}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Update the question details below."
                  : "Fill in the details below to create a new question."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="question_text" className="text-right">
                    Question*
                  </label>
                  <Textarea
                    id="question_text"
                    value={currentQuestion.question_text || ''}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, question_text: e.target.value})}
                    className="col-span-3"
                    placeholder="Enter your question here..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="question_type" className="text-right">
                    Question Type
                  </label>
                  <Select
                    value={currentQuestion.question_type || 'multiple_choice'}
                    onValueChange={(value) => setCurrentQuestion({...currentQuestion, question_type: value})}
                  >
                    <SelectTrigger id="question_type" className="col-span-3">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice (Single Answer)</SelectItem>
                      <SelectItem value="multiple_answer">Multiple Choice (Multiple Answers)</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="points" className="text-right">
                    Points
                  </label>
                  <Input
                    id="points"
                    type="number"
                    value={currentQuestion.points?.toString() || '1'}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion, 
                      points: parseInt(e.target.value) || 1
                    })}
                    className="col-span-3"
                    min="1"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4 mt-4">
                  <label className="text-right pt-2">
                    Answer Options*
                  </label>
                  <div className="col-span-3 space-y-4">
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-grow">
                          <Input
                            value={option.option_text}
                            onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`correct-${index}`}
                              checked={option.is_correct}
                              onCheckedChange={(checked) => updateOption(index, 'is_correct', Boolean(checked))}
                            />
                            <label htmlFor={`correct-${index}`} className="text-sm">
                              Correct
                            </label>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index)}
                            disabled={currentQuestion.options?.length <= 2}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addOption}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Option
                    </Button>
                    
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentQuestion.question_type === 'multiple_choice' ? 
                        'Select exactly one correct answer.' :
                        'You can select multiple correct answers.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Save Changes' : 'Create Question'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length > 0 ? (
                  questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>{question.sequence_order + 1}</TableCell>
                      <TableCell className="font-medium">
                        {question.question_text.length > 50
                          ? `${question.question_text.substring(0, 50)}...`
                          : question.question_text}
                      </TableCell>
                      <TableCell>
                        {question.question_type === 'multiple_choice' && 'Multiple Choice'}
                        {question.question_type === 'multiple_answer' && 'Multiple Answer'}
                        {question.question_type === 'true_false' && 'True/False'}
                      </TableCell>
                      <TableCell>{question.points}</TableCell>
                      <TableCell>
                        {question.options?.length || 0} option(s)
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditQuestion(question)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Question
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => moveQuestion(question, 'up')}
                              disabled={questions.indexOf(question) === 0}
                            >
                              <MoveUp className="h-4 w-4 mr-2" />
                              Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => moveQuestion(question, 'down')}
                              disabled={questions.indexOf(question) === questions.length - 1}
                            >
                              <MoveDown className="h-4 w-4 mr-2" />
                              Move Down
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Question
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No questions found for this quiz. Click 'Add Question' to create your first question.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
