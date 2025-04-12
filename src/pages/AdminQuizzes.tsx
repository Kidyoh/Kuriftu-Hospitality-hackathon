
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  ChevronLeft, MoreHorizontal, Plus, Edit, Trash2, FileQuestion, 
  Clock, BookOpen, BarChart 
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  time_limit: number | null;
  lesson_id: string | null;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
}

export default function AdminQuizzes() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    passing_score: 70,
    time_limit: 30,
  });
  
  useEffect(() => {
    if (!courseId) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', courseId)
          .single();
          
        if (courseError) throw courseError;
        setCourse(courseData);
        
        // Fetch quizzes for this course
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });
          
        if (quizError) throw quizError;
        setQuizzes(quizData || []);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [courseId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId || !currentQuiz.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a quiz title.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let result;
      
      if (isEditing && currentQuiz.id) {
        // Update existing quiz
        result = await supabase
          .from('quizzes')
          .update({
            title: currentQuiz.title,
            description: currentQuiz.description,
            passing_score: currentQuiz.passing_score,
            time_limit: currentQuiz.time_limit,
          })
          .eq('id', currentQuiz.id)
          .select();
          
        toast({
          title: "Quiz Updated",
          description: "The quiz has been successfully updated."
        });
      } else {
        // Create new quiz
        result = await supabase
          .from('quizzes')
          .insert({
            course_id: courseId,
            title: currentQuiz.title,
            description: currentQuiz.description,
            passing_score: currentQuiz.passing_score,
            time_limit: currentQuiz.time_limit,
          })
          .select();
          
        toast({
          title: "Quiz Created",
          description: "A new quiz has been successfully created."
        });
      }
      
      if (result.error) throw result.error;
      
      // Refresh quizzes list
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setQuizzes(data || []);
      
      handleDialogClose();
      
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setCurrentQuiz({
      title: '',
      description: '',
      passing_score: 70,
      time_limit: 30,
    });
  };
  
  const handleEditQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setIsEditing(true);
    setIsDialogOpen(true);
  };
  
  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz? All questions and attempts will also be deleted.")) {
      return;
    }
    
    try {
      // Delete quiz responses first
      await supabase
        .from('quiz_responses')
        .delete()
        .in('attempt_id', (qb) => {
          qb.select('id').from('quiz_attempts').eq('quiz_id', id);
        });
        
      // Delete quiz attempts
      await supabase
        .from('quiz_attempts')
        .delete()
        .eq('quiz_id', id);
      
      // Delete quiz options
      await supabase
        .from('quiz_options')
        .delete()
        .in('question_id', (qb) => {
          qb.select('id').from('quiz_questions').eq('quiz_id', id);
        });
      
      // Delete quiz questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', id);
      
      // Finally delete the quiz itself
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted."
      });
      
      // Update quizzes list
      setQuizzes(quizzes.filter(quiz => quiz.id !== id));
      
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleManageQuestions = (quizId: string) => {
    navigate(`/admin/courses/${courseId}/quizzes/${quizId}/questions`);
  };
  
  const handleViewResults = (quizId: string) => {
    // This would navigate to a results page
    toast({
      description: "Quiz results feature coming soon."
    });
  };
  
  if (!courseId) {
    return <div>Course ID is required</div>;
  }
  
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/courses')} 
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Quizzes for {course?.title || '...'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage quizzes for this course
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditing ? "Edit Quiz" : "Create New Quiz"}</DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? "Update the quiz details below." 
                    : "Fill in the details to create a new quiz."}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Quiz Title *
                  </label>
                  <Input
                    id="title"
                    value={currentQuiz.title || ''}
                    onChange={(e) => setCurrentQuiz({...currentQuiz, title: e.target.value})}
                    placeholder="Final Assessment"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={currentQuiz.description || ''}
                    onChange={(e) => setCurrentQuiz({...currentQuiz, description: e.target.value})}
                    placeholder="Test your knowledge of the course content..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="passingScore" className="text-sm font-medium">
                      Passing Score (%)
                    </label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={currentQuiz.passing_score?.toString() || '70'}
                      onChange={(e) => setCurrentQuiz({
                        ...currentQuiz, 
                        passing_score: parseInt(e.target.value) || 70
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="timeLimit" className="text-sm font-medium">
                      Time Limit (minutes)
                    </label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="0"
                      value={currentQuiz.time_limit?.toString() || '30'}
                      onChange={(e) => setCurrentQuiz({
                        ...currentQuiz, 
                        time_limit: parseInt(e.target.value) || 30
                      })}
                    />
                  </div>
                </div>
                
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditing ? 'Save Changes' : 'Create Quiz'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
                  <TableHead>Title</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.length > 0 ? (
                  quizzes.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell className="font-medium">{quiz.title}</TableCell>
                      <TableCell>{quiz.passing_score || 70}%</TableCell>
                      <TableCell>{quiz.time_limit || 30} minutes</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <FileQuestion className="mr-1 h-3 w-3" />
                          0 Questions
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(quiz.created_at).toLocaleDateString()}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleEditQuiz(quiz)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Quiz
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageQuestions(quiz.id)}>
                              <FileQuestion className="mr-2 h-4 w-4" />
                              Manage Questions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewResults(quiz.id)}>
                              <BarChart className="mr-2 h-4 w-4" />
                              View Results
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Quiz
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center py-4">
                        <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No quizzes created yet</p>
                        <p className="text-sm text-muted-foreground mb-4">Create your first quiz to assess student learning</p>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Quiz
                          </Button>
                        </DialogTrigger>
                      </div>
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
