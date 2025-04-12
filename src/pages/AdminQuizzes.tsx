
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
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, MoreHorizontal, Edit, Trash2, BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  lesson_id: string | null;
  passing_score: number | null;
  time_limit: number | null;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  title: string;
}

export default function AdminQuizzes() {
  const { courseId, lessonId } = useParams<{ courseId: string, lessonId?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    passing_score: 70,
    time_limit: 30,
    course_id: courseId,
    lesson_id: lessonId || null
  });
  
  useEffect(() => {
    if (profile && profile.role === 'admin' && courseId) {
      loadCourseDetails();
      loadLessons();
      
      // If we have a lessonId, load that lesson's details
      if (lessonId) {
        loadLessonDetails();
      }
      
      loadQuizzes();
    } else {
      navigate('/dashboard');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
    }
  }, [profile, courseId, lessonId, navigate]);
  
  const loadCourseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();
        
      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast({
        title: "Error",
        description: "Failed to load course details.",
        variant: "destructive"
      });
    }
  };
  
  const loadLessonDetails = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('id, title')
        .eq('id', lessonId)
        .single();
        
      if (error) throw error;
      setLesson(data);
    } catch (error) {
      console.error('Error fetching lesson details:', error);
      toast({
        title: "Error",
        description: "Failed to load lesson details.",
        variant: "destructive"
      });
    }
  };
  
  const loadLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('id, title')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true });
        
      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };
  
  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId);
        
      // If we have a lessonId, filter by that as well
      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to load quizzes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
      course_id: courseId,
      lesson_id: lessonId || null
    });
  };
  
  const handleEditQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setIsEditing(true);
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentQuiz.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a quiz title.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let result;
      
      if (isEditing && currentQuiz.id) {
        result = await supabase
          .from('quizzes')
          .update({
            title: currentQuiz.title,
            description: currentQuiz.description,
            passing_score: currentQuiz.passing_score,
            time_limit: currentQuiz.time_limit,
            lesson_id: currentQuiz.lesson_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentQuiz.id)
          .select();
          
        toast({
          title: "Quiz Updated",
          description: "The quiz has been successfully updated."
        });
      } else {
        result = await supabase
          .from('quizzes')
          .insert({
            title: currentQuiz.title,
            description: currentQuiz.description,
            passing_score: currentQuiz.passing_score,
            time_limit: currentQuiz.time_limit,
            course_id: courseId,
            lesson_id: currentQuiz.lesson_id
          })
          .select();
          
        toast({
          title: "Quiz Created",
          description: "A new quiz has been successfully created."
        });
      }
      
      if (result.error) throw result.error;
      
      loadQuizzes();
      handleDialogClose();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteQuiz = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.");
    
    if (!confirmed) return;
    
    try {
      // First, delete all related quiz questions and options
      await deleteQuizQuestions(id);
      
      // Then delete the quiz itself
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted."
      });
      
      loadQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz.",
        variant: "destructive"
      });
    }
  };
  
  const deleteQuizQuestions = async (quizId: string) => {
    try {
      // Get all questions for this quiz
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('quiz_id', quizId);
        
      if (questionsError) throw questionsError;
      
      // Delete all options for each question
      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        
        const { error: optionsError } = await supabase
          .from('quiz_options')
          .delete()
          .in('question_id', questionIds);
          
        if (optionsError) throw optionsError;
        
        // Delete all questions
        const { error: deleteQuestionsError } = await supabase
          .from('quiz_questions')
          .delete()
          .eq('quiz_id', quizId);
          
        if (deleteQuestionsError) throw deleteQuestionsError;
      }
    } catch (error) {
      console.error('Error deleting quiz questions and options:', error);
      throw error;
    }
  };
  
  const handleManageQuestions = (quizId: string) => {
    navigate(`/admin/courses/${courseId}/quizzes/${quizId}/questions`);
  };
  
  const getBackNavigationUrl = () => {
    if (lessonId) {
      return `/admin/courses/${courseId}/lessons`;
    } else {
      return `/admin/courses`;
    }
  };
  
  const getPageTitle = () => {
    if (lesson) {
      return `Quizzes for Lesson: ${lesson.title}`;
    } else {
      return `Quizzes for Course: ${course?.title}`;
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
        {lessonId ? 'Back to Lessons' : 'Back to Courses'}
      </Button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage quizzes to assess learner progress
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Quiz" : "Create New Quiz"}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Update the quiz details below."
                  : "Fill in the details below to create a new quiz."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="title" className="text-right">
                    Quiz Title*
                  </label>
                  <Input
                    id="title"
                    value={currentQuiz.title || ''}
                    onChange={(e) => setCurrentQuiz({...currentQuiz, title: e.target.value})}
                    className="col-span-3"
                    placeholder="Module 1 Assessment"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={currentQuiz.description || ''}
                    onChange={(e) => setCurrentQuiz({...currentQuiz, description: e.target.value})}
                    className="col-span-3"
                    placeholder="Test your knowledge of the material covered in this module..."
                  />
                </div>
                
                {!lessonId && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="lesson" className="text-right">
                      Related Lesson
                    </label>
                    <Select
                      value={currentQuiz.lesson_id || ''}
                      onValueChange={(value) => setCurrentQuiz({...currentQuiz, lesson_id: value || null})}
                    >
                      <SelectTrigger id="lesson" className="col-span-3">
                        <SelectValue placeholder="Select a lesson (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Course-level quiz (no specific lesson)</SelectItem>
                        {lessons.map((lesson) => (
                          <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="passing_score" className="text-right">
                    Passing Score (%)
                  </label>
                  <Input
                    id="passing_score"
                    type="number"
                    value={currentQuiz.passing_score?.toString() || '70'}
                    onChange={(e) => setCurrentQuiz({
                      ...currentQuiz, 
                      passing_score: parseInt(e.target.value) || 70
                    })}
                    className="col-span-3"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="time_limit" className="text-right">
                    Time Limit (min)
                  </label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={currentQuiz.time_limit?.toString() || '30'}
                    onChange={(e) => setCurrentQuiz({
                      ...currentQuiz, 
                      time_limit: parseInt(e.target.value) || 30
                    })}
                    className="col-span-3"
                    min="0"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
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
                  <TableHead>Description</TableHead>
                  {!lessonId && <TableHead>Lesson</TableHead>}
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.length > 0 ? (
                  quizzes.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell className="font-medium">{quiz.title}</TableCell>
                      <TableCell>
                        {quiz.description ? (
                          quiz.description.length > 50 
                            ? `${quiz.description.substring(0, 50)}...` 
                            : quiz.description
                        ) : '—'}
                      </TableCell>
                      {!lessonId && (
                        <TableCell>
                          {quiz.lesson_id ? 
                            lessons.find(l => l.id === quiz.lesson_id)?.title || 'Unknown Lesson' 
                            : 'Course-level Quiz'}
                        </TableCell>
                      )}
                      <TableCell>{quiz.passing_score || 70}%</TableCell>
                      <TableCell>{quiz.time_limit || 30} min</TableCell>
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
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Quiz
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageQuestions(quiz.id)}>
                              <BookOpen className="h-4 w-4 mr-2" />
                              Manage Questions
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Quiz
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={lessonId ? 6 : 7} className="h-24 text-center">
                      No quizzes found. Click 'Add Quiz' to create your first quiz.
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
