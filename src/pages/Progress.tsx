import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserProgressSummary, updateLessonProgress } from '@/utils/trackingUtils';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Clock, Award, BookOpen, PieChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  LinearProgress, 
  Chip, 
  CircularProgress, 
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Theme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// Styled Accordion for consistent styling
const StyledAccordion = styled(Accordion)(({ theme }: { theme: Theme }) => ({
  marginBottom: theme.spacing(2),
  '&:before': {
    display: 'none',
  },
}));

interface ProgressData {
  courses: Array<{
    courses: {
      title: string;
      description: string;
      difficulty_level: string;
      category: string;
      estimated_hours: number;
    };
    lessonStats: {
      total: number;
      completed: number;
      inProgress: number;
      averageProgress: number;
      lessons: Array<{
        id: string;
        title: string;
        progress: number;
        completed: boolean;
        completedAt: string | null;
        startedAt: string | null;
        sequenceOrder: number;
      }>;
    };
    quizStats: {
      total: number;
      passed: number;
      averageScore: number;
      perfectScores: number;
      quizzes: Array<{
        id: string;
        title: string;
        score: number;
        passed: boolean;
        completedAt: string | null;
        passingScore: number;
      }>;
    };
  }>;
  quizStats: {
    total: number;
    passed: number;
    perfectScores: number;
    averageScore: number;
  };
  achievementStats: {
    total: number;
    completed: number;
    in_progress: number;
    completion_percentage: number;
    total_points_earned: number;
  };
  overallProgress: number;
  lastUpdated: string;
}

interface CourseProgress {
  course_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  started_at: string | null;
  last_accessed: string;
  courses: {
    id: string;
    title: string;
    description: string;
    difficulty_level: string;
  };
  lessonStats: {
    total: number;
    completed: number;
  };
}

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  order_index: number;
  progress?: number;
  completed?: boolean;
}

export default function Progress() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseLessons, setCourseLessons] = useState<Record<string, Lesson[]>>({});
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchUserProgress();
    }
  }, [profile?.id]);
  
  useEffect(() => {
    if (expandedCourse && !courseLessons[expandedCourse]) {
      fetchCourseLessons(expandedCourse);
    }
  }, [expandedCourse]);

  const fetchUserProgress = async () => {
    if (!profile?.id) return;
    
    try {
      setIsLoading(true);
      const data = await getUserProgressSummary(profile.id);
      
      if ('error' in data) {
        throw new Error('Failed to fetch progress data');
      }
      
      setProgressData(data as ProgressData);
    } catch (err) {
      setError('Failed to load progress data. Please try again later.');
      console.error('Error fetching progress:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCourseLessons = async (courseId: string) => {
    try {
      // Get all lessons for the course
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, title, course_id, order_index')
        .eq('course_id', courseId)
        .order('order_index');
      
      if (lessonsError) throw lessonsError;
      
      if (!profile?.id) return;
      
      // Get user's progress for these lessons
      const { data: userLessons, error: userLessonsError } = await supabase
        .from('user_lessons')
        .select('lesson_id, progress, completed')
        .eq('user_id', profile.id)
        .eq('course_id', courseId);
      
      if (userLessonsError) throw userLessonsError;
      
      // Combine the data
      const lessonsWithProgress = (lessons || []).map(lesson => {
        const userProgress = userLessons?.find(ul => ul.lesson_id === lesson.id);
        return {
          ...lesson,
          progress: userProgress?.progress || 0,
          completed: userProgress?.completed || false
        };
      });
      
      setCourseLessons(prev => ({
        ...prev,
        [courseId]: lessonsWithProgress
      }));
    } catch (error) {
      console.error('Error fetching course lessons:', error);
      toast({
        title: "Error",
        description: "Failed to load lesson data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleProgressUpdate = async (lessonId: string, courseId: string, progress: number) => {
    if (!profile?.id) return;
    
    try {
      setUpdatingLessonId(lessonId);
      
      const result = await updateLessonProgress(
        profile.id,
        lessonId,
        courseId,
        progress
      );
      
      if ('error' in result) {
        throw result.error;
      }
      
      // Update local state
      setCourseLessons(prev => ({
        ...prev,
        [courseId]: prev[courseId].map(lesson => 
          lesson.id === lessonId 
            ? { ...lesson, progress, completed: progress === 100 }
            : lesson
        )
      }));
      
      // Refresh overall progress data
      fetchUserProgress();
      
      toast({
        title: "Progress updated",
        description: progress === 100 
          ? "Lesson marked as completed!" 
          : `Progress updated to ${progress}%`,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update your progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingLessonId(null);
    }
  };

  const renderLoading = () => (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }
  
  if (!progressData || progressData.courses.length === 0) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">My Progress</h1>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No courses started yet</h2>
            <p className="text-muted-foreground mb-6">
              Enroll in courses to start tracking your learning progress
            </p>
            <Button onClick={() => navigate('/courses')}>
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Overall Progress Summary */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Learning Progress
        </Typography>
        <Box display="flex" flexWrap="wrap" sx={{ mx: -1.5 }}>
          <Box width={{ xs: '100%', md: '25%' }} p={1.5}>
        <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
              Overall Progress
                </Typography>
                <Box position="relative" display="inline-flex">
                  <CircularProgress
                    variant="determinate"
                    value={progressData.overallProgress}
                    size={80}
                  />
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    bottom={0}
                    right={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography variant="body2" component="div" color="textSecondary">
                      {`${Math.round(progressData.overallProgress)}%`}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box width={{ xs: '100%', md: '25%' }} p={1.5}>
            <Card>
          <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Quiz Performance
                </Typography>
                <Typography variant="h5">
                  {Math.round(progressData.quizStats.averageScore)}%
                </Typography>
                <Typography variant="body2">
                  Passed: {progressData.quizStats.passed}/{progressData.quizStats.total}
                </Typography>
                <Typography variant="body2">
                  Perfect Scores: {progressData.quizStats.perfectScores}
                </Typography>
          </CardContent>
        </Card>
          </Box>
          <Box width={{ xs: '100%', md: '25%' }} p={1.5}>
        <Card>
          <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Achievements
                </Typography>
                <Typography variant="h5">
                  {progressData.achievementStats.completed}/{progressData.achievementStats.total}
                </Typography>
                <Typography variant="body2">
                  Points Earned: {progressData.achievementStats.total_points_earned}
                </Typography>
          </CardContent>
        </Card>
          </Box>
          <Box width={{ xs: '100%', md: '25%' }} p={1.5}>
        <Card>
          <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {formatDate(progressData.lastUpdated)}
                </Typography>
          </CardContent>
        </Card>
          </Box>
        </Box>
      </Box>

      {/* Course Progress */}
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Course Progress
        </Typography>
        {progressData.courses.map((course) => (
          <StyledAccordion key={course.courses.title}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`course-${course.courses.title}-content`}
              id={`course-${course.courses.title}-header`}
            >
              <Box sx={{ width: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{course.courses.title}</Typography>
                  <Box>
                    <Chip
                      size="small"
                      label={course.courses.difficulty_level}
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      size="small"
                      label={course.courses.category}
                    />
                  </Box>
                </Box>
                <Box mt={1}>
                  <LinearProgress
                    variant="determinate"
                    value={course.lessonStats.averageProgress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="body2" color="textSecondary">
                      {`${Math.round(course.lessonStats.averageProgress)}% Complete`}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {`Est. ${course.courses.estimated_hours} hours`}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexWrap="wrap" sx={{ mx: -1.5 }}>
                <Box width={{ xs: '100%', md: '50%' }} p={1.5}>
                  <Typography variant="subtitle1" gutterBottom>
                    Lessons ({course.lessonStats.completed}/{course.lessonStats.total})
                  </Typography>
                  {course.lessonStats.lessons
                    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                    .map((lesson) => (
                      <Box key={lesson.id} mb={2}>
                        <Box display="flex" alignItems="center">
                          {lesson.completed ? (
                            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                          ) : lesson.progress > 0 ? (
                            <PlayCircleOutlineIcon color="primary" sx={{ mr: 1 }} />
                          ) : (
                            <PlayCircleOutlineIcon color="disabled" sx={{ mr: 1 }} />
                          )}
                          <Typography variant="body2">
                            {lesson.title}
                          </Typography>
                        </Box>
                        {lesson.progress > 0 && !lesson.completed && (
                          <LinearProgress
                            variant="determinate"
                            value={lesson.progress}
                            sx={{ mt: 1, height: 4 }}
                          />
                        )}
                      </Box>
                    ))}
                </Box>
                <Box width={{ xs: '100%', md: '50%' }} p={1.5}>
                  <Typography variant="subtitle1" gutterBottom>
                    Quizzes ({course.quizStats.passed}/{course.quizStats.total})
                  </Typography>
                  {course.quizStats.quizzes
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((quiz) => (
                      <Box key={quiz.id} mb={2}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center">
                            {quiz.score === 100 ? (
                              <EmojiEventsIcon color="primary" sx={{ mr: 1 }} />
                            ) : quiz.passed ? (
                              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                            ) : (
                              <CheckCircleIcon color="disabled" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="body2">
                              {quiz.title}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color={quiz.passed ? 'success.main' : 'error.main'}>
                            {quiz.score}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                </Box>
              </Box>
            </AccordionDetails>
          </StyledAccordion>
        ))}
      </Box>
    </Container>
  );
}

// Date formatting function
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
} 