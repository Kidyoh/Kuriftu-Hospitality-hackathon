import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Check, FileQuestion,
  MoreHorizontal, Edit
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  sequence_order: number;
  points: number;
  options?: QuestionOption[];
}

interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
}

export default function AdminQuizQuestions() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    question_text: '',
    question_type: 'text',
    points: 1
  });
  
  const [questionOptions, setQuestionOptions] = useState<Partial<QuestionOption>[]>([]);
  
  useEffect(() => {
    if (!quizId) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Clean up any empty options in the database
        await cleanupEmptyOptions();
        
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('id, title, description, course_id')
          .eq('id', quizId)
          .single();
          
        if (quizError) throw quizError;
        setQuiz(quizData);
        
        // Fetch questions for this quiz
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('sequence_order', { ascending: true });
          
        if (questionError) throw questionError;
        
        if (questionData) {
          // For each question, get its options only if it's multiple choice
          const questionsWithOptions = await Promise.all(questionData.map(async (q) => {
            if (q.question_type === 'multiple_choice') {
              const { data: optionData } = await supabase
                .from('quiz_options')
                .select('*')
                .eq('question_id', q.id)
                .order('sequence_order', { ascending: true });
                
              // Filter out any options with empty text
              const validOptions = optionData ? optionData.filter(opt => opt.option_text && opt.option_text.trim() !== '') : [];
              return { ...q, options: validOptions };
            }
            
            // For text questions, just return empty options array
            return { ...q, options: [] };
          }));
          
          setQuestions(questionsWithOptions);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz questions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [quizId]);
  
  // Function to clean up any empty options in the database
  const cleanupEmptyOptions = async () => {
    try {
      // Delete any quiz options that have empty text
      const { error } = await supabase
        .from('quiz_options')
        .delete()
        .eq('option_text', '')
        .or('option_text.is.null');
        
      if (error) {
        console.error('Error cleaning up empty options:', error);
      }
    } catch (err) {
      console.error('Failed to cleanup empty options:', err);
    }
  };
  
  const handleAddOption = () => {
    setQuestionOptions([
      ...questionOptions, 
      { 
        option_text: '', 
        is_correct: false, 
        sequence_order: questionOptions.length 
      }
    ]);
  };
  
  const handleRemoveOption = (index: number) => {
    if (questionOptions.length <= 2) {
      toast({
        title: "Cannot Remove",
        description: "Multiple choice questions require at least 2 options.",
        variant: "destructive",
      });
      return;
    }
    
    const newOptions = [...questionOptions];
    newOptions.splice(index, 1);
    
    // Update sequence order
    const updatedOptions = newOptions.map((option, idx) => ({
      ...option,
      sequence_order: idx
    }));
    
    setQuestionOptions(updatedOptions);
  };
  
  const handleOptionChange = (index: number, field: keyof QuestionOption, value: any) => {
    const newOptions = [...questionOptions];
    
    // If changing 'is_correct', and it's being set to true, make other options false
    if (field === 'is_correct' && value === true) {
      newOptions.forEach((option, i) => {
        if (i !== index) {
          option.is_correct = false;
        }
      });
    }
    
    // Update the specific field
    newOptions[index] = { ...newOptions[index], [field]: value };
    setQuestionOptions(newOptions);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizId || !currentQuestion.question_text) {
      toast({
        title: "Missing Information",
        description: "Please provide a question text.",
        variant: "destructive",
      });
      return;
    }
    
    // We only need to validate options for multiple choice questions
    if (currentQuestion.question_type === 'multiple_choice') {
      // Filter out empty options before validation
      const validOptions = questionOptions.filter(opt => opt.option_text?.trim());
      
      if (validOptions.length < 2) {
        toast({
          title: "Invalid Options",
          description: "Please provide at least 2 options.",
          variant: "destructive",
        });
        return;
      }

      const hasCorrectOption = validOptions.some(opt => opt.is_correct);
      
      if (!hasCorrectOption) {
        toast({
          title: "Invalid Options",
          description: "Please mark at least one option as correct.",
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      let questionId;
      
      if (isEditing && currentQuestion.id) {
        // Update existing question
        const { error } = await supabase
          .from('quiz_questions')
          .update({
            question_text: currentQuestion.question_text,
            question_type: currentQuestion.question_type,
            points: currentQuestion.points || 1
          })
          .eq('id', currentQuestion.id);
          
        if (error) throw error;
        
        questionId = currentQuestion.id;
        
        // For multiple choice questions or when changing from multiple choice to text
        // Always delete existing options when editing (for multiple choice or type changes)
        await supabase
          .from('quiz_options')
          .delete()
          .eq('question_id', questionId);
        
        toast({
          title: "Question Updated",
          description: "The question has been successfully updated."
        });
      } else {
        // Create new question
        const { data, error } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizId,
            question_text: currentQuestion.question_text,
            question_type: currentQuestion.question_type,
            points: currentQuestion.points || 1,
            sequence_order: questions.length
          })
          .select()
          .single();
          
        if (error) throw error;
        
        questionId = data.id;
        
        toast({
          title: "Question Created",
          description: "A new question has been successfully created."
        });
      }
      
      // ONLY add options if this is explicitly a multiple choice question
      if (currentQuestion.question_type === 'multiple_choice' && questionId && questionOptions.length > 0) {
        // Filter out empty options and reorder sequence
        const validOptions = questionOptions
          .filter(opt => opt.option_text && opt.option_text.trim() !== '')
          .map((option, index) => ({
            question_id: questionId,
            option_text: option.option_text?.trim(),
            is_correct: option.is_correct || false,
            sequence_order: index
          }));
        
        if (validOptions.length > 0) {
          const { error: optionError } = await supabase
            .from('quiz_options')
            .insert(validOptions);
            
          if (optionError) throw optionError;
        }
      }
      
      // Refresh questions list
      const { data: refreshedQuestions, error: refreshError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sequence_order', { ascending: true });
        
      if (refreshError) throw refreshError;
      
      // Get options for each question
      const questionsWithOptions = await Promise.all(refreshedQuestions.map(async (q) => {
        // Only fetch options for multiple choice questions
        if (q.question_type === 'multiple_choice') {
          const { data: optionData } = await supabase
            .from('quiz_options')
            .select('*')
            .eq('question_id', q.id)
            .order('sequence_order', { ascending: true });
            
            // Filter out any options with empty text
            const validOptions = optionData ? optionData.filter(opt => opt.option_text && opt.option_text.trim() !== '') : [];
            return { ...q, options: validOptions };
        }
        
        // For text questions, explicitly return empty options array
        return { ...q, options: [] };
      }));
      
      setQuestions(questionsWithOptions);
      handleDialogClose();
      
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setCurrentQuestion({
      question_text: '',
      question_type: 'text',
      points: 1
    });
    
    // Start with empty options array
    setQuestionOptions([]);
  };
  
  const handleEditQuestion = (question: Question) => {
    setCurrentQuestion(question);
    
    if (question.question_type === 'multiple_choice') {
      // For multiple choice questions, set up the options
      if (!question.options || question.options.length < 2) {
        // Ensure we have at least 2 options for multiple choice
        setQuestionOptions([
          { option_text: '', is_correct: false, sequence_order: 0 },
          { option_text: '', is_correct: false, sequence_order: 1 }
        ]);
      } else {
        // Use existing options
        setQuestionOptions(question.options);
      }
    } else {
      // For text questions, ensure the options array is empty
      setQuestionOptions([]);
    }
    
    setIsEditing(true);
    setIsDialogOpen(true);
  };
  
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }
    
    try {
      // Get the question to check if it has options
      const question = questions.find(q => q.id === id);
      
      // Delete options if this is a multiple choice question
      if (question && question.question_type === 'multiple_choice') {
        const { error: optionsError } = await supabase
          .from('quiz_options')
          .delete()
          .eq('question_id', id);
          
        if (optionsError) throw optionsError;
      }
      
      // Delete the question
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Question Deleted",
        description: "The question has been successfully deleted."
      });
      
      // Update the questions list
      setQuestions(questions.filter(q => q.id !== id));
      
      // Reorder the remaining questions
      const reorderedQuestions = questions
        .filter(q => q.id !== id)
        .map((q, index) => ({ ...q, sequence_order: index }));
        
      for (const q of reorderedQuestions) {
        await supabase
          .from('quiz_questions')
          .update({ sequence_order: q.sequence_order })
          .eq('id', q.id);
      }
      
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveQuestion = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up') {
      if (currentIndex === 0) return;
      newIndex = currentIndex - 1;
    } else {
      if (currentIndex === questions.length - 1) return;
      newIndex = currentIndex + 1;
    }
    
    try {
      // Swap sequence_order values
      const currentQuestion = questions[currentIndex];
      const targetQuestion = questions[newIndex];
      
      await supabase
        .from('quiz_questions')
        .update({ sequence_order: targetQuestion.sequence_order })
        .eq('id', currentQuestion.id);
        
      await supabase
        .from('quiz_questions')
        .update({ sequence_order: currentQuestion.sequence_order })
        .eq('id', targetQuestion.id);
        
      // Update local state
      const updatedQuestions = [...questions];
      [updatedQuestions[currentIndex], updatedQuestions[newIndex]] = 
        [updatedQuestions[newIndex], updatedQuestions[currentIndex]];
        
      // Update sequence_order in local state
      updatedQuestions[currentIndex].sequence_order = currentIndex;
      updatedQuestions[newIndex].sequence_order = newIndex;
      
      setQuestions(updatedQuestions);
      
    } catch (error) {
      console.error('Error reordering questions:', error);
      toast({
        title: "Error",
        description: "Failed to reorder questions. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!quizId || !courseId) {
    return <div>Course ID and Quiz ID are required</div>;
  }
  
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/admin/courses/${courseId}/quizzes`)} 
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Quizzes
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Questions for {quiz?.title || '...'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage questions for this quiz
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Edit Question" : "Create New Question"}</DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? "Update the question details below." 
                    : "Fill in the details to create a new question."}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label htmlFor="questionText" className="text-sm font-medium">
                    Question *
                  </label>
                  <Textarea
                    id="questionText"
                    value={currentQuestion.question_text || ''}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion, 
                      question_text: e.target.value
                    })}
                    placeholder="What is the capital of France?"
                    rows={2}
                    required
                  />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="space-y-2 flex-1">
                    <label htmlFor="questionType" className="text-sm font-medium">
                      Question Type
                    </label>
                    <Select
                      value={currentQuestion.question_type}
                      onValueChange={(value) => {
                        setCurrentQuestion({
                          ...currentQuestion,
                          question_type: value
                        });
                        
                        // For multiple choice, ensure we have default options
                        if (value === 'multiple_choice') {
                          setQuestionOptions([
                            { option_text: '', is_correct: false, sequence_order: 0 },
                            { option_text: '', is_correct: false, sequence_order: 1 }
                          ]);
                        } else {
                          // For text questions, clear the options array completely
                          setQuestionOptions([]);
                        }
                      }}
                    >
                      <SelectTrigger id="questionType">
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="text">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 md:w-1/3">
                    <label htmlFor="points" className="text-sm font-medium">
                      Points
                    </label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      step="1"
                      value={currentQuestion.points?.toString() || '1'}
                      onChange={(e) => setCurrentQuestion({
                        ...currentQuestion,
                        points: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>
                </div>
                
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Answer Options</h3>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                        <Plus className="mr-2 h-3 w-3" /> Add Option
                      </Button>
                    </div>
                    
                    {questionOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 border p-3 rounded-md">
                        <div className="flex h-fit items-center space-x-2">
                          <Checkbox
                            id={`correct-${index}`}
                            checked={option.is_correct}
                            onCheckedChange={(checked) => 
                              handleOptionChange(index, 'is_correct', checked === true)
                            }
                          />
                          <label
                            htmlFor={`correct-${index}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Correct
                          </label>
                        </div>
                        
                        <Input
                          value={option.option_text || ''}
                          onChange={(e) => 
                            handleOptionChange(index, 'option_text', e.target.value)
                          }
                          placeholder={`Option ${index + 1}`}
                          className="flex-1"
                          required
                        />
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                          disabled={questionOptions.length <= 2}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {currentQuestion.question_type === 'text' && (
                  <div className="bg-gray-50 p-3 rounded-md border border-dashed border-gray-300 mt-4">
                    <p className="text-muted-foreground text-sm italic">
                      This is a short answer question. Students will type in their response.
                    </p>
                  </div>
                )}
                
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditing ? 'Save Changes' : 'Add Question'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {questions.length > 0 ? (
              questions.map((question, index) => (
                <Card key={question.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`py-0 ${
                            question.question_type === 'multiple_choice' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {question.question_type === 'multiple_choice' 
                              ? 'Multiple Choice' 
                              : 'Short Answer'}
                          </Badge>
                          <Badge variant="secondary" className="py-0">
                            {question.points} {question.points === 1 ? 'point' : 'points'}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-1">
                          {index + 1}. {question.question_text}
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleMoveQuestion(question.id, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleMoveQuestion(question.id, 'down')}
                          disabled={index === questions.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditQuestion(question)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {question.question_type === 'multiple_choice' && question.options && question.options.length > 0 ? (
                    <CardContent className="pt-4">
                      <div className="grid gap-2">
                        {question.options
                          .filter(option => option.option_text && option.option_text.trim() !== '')
                          .map((option, optIdx) => (
                            <div 
                              key={option.id} 
                              className={`flex items-center p-2 rounded-md border ${
                                option.is_correct ? 'border-green-500 bg-green-50' : 'border-gray-200'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                option.is_correct 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-gray-100'
                              }`}>
                                {option.is_correct && <Check className="h-3 w-3" />}
                              </div>
                              <span>{option.option_text}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  ) : question.question_type === 'text' ? (
                    <CardContent className="pt-4">
                      <div className="bg-gray-50 p-3 rounded-md border border-dashed border-gray-300">
                        <p className="text-muted-foreground text-sm italic">
                          Short answer question - students will enter free text response
                        </p>
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No questions added yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Create your first question for this quiz</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add First Question
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
