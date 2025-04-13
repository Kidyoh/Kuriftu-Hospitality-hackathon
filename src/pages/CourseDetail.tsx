import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Clock, 
  Award, 
  Layers, 
  PlayCircle, 
  CheckCircle, 
  BarChart,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ensureQuizTablesExist, 
  createSampleQuizForCourse, 
  checkTableExists, 
  createMinimalQuizStructure, 
  ensureUserProgressTablesExist, 
  associateQuizzesWithLessons, 
  addLastAccessedColumn, 
  createUserLessonsTable, 
  ensureDebugTableInfoExists, 
  fetchQuizzesBySQL,
  ensureCreateUserQuizResultsRPC
} from '@/utils/dbUtils';
import { checkUserAchievements, awardPoints } from '@/utils/incentivesUtils';

interface Course {
  id: string;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  difficulty_level: string | null;
  created_at: string;
  status: string | null;
  category: string | null;
  related_skill: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  sequence_order: number | null;
  completed?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  completed?: boolean;
  score?: number | null;
  lesson_id?: string;
}

interface UserCourse {
  progress: number;
  completed: boolean;
  last_accessed: string | null;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [userCourse, setUserCourse] = useState<UserCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [quizScores, setQuizScores] = useState<Record<string, number | null>>({});
  
  useEffect(() => {
    if (!courseId || !profile) return;
    
    const fetchCourseData = async () => {
      setIsLoading(true);
      
      try {
        // First, check if required tables exist
        await ensureUserProgressTablesExist();
        
        // Check if quiz tables exist
        const tablesExist = await ensureQuizTablesExist();
        if (!tablesExist) {
          console.warn('Some quiz tables may be missing. Using fallback approach.');
        }
        
        // Ensure debug function exists for troubleshooting
        await ensureDebugTableInfoExists();
        
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
          
        if (courseError) throw courseError;
        setCourse(courseData);
        
        // Fetch lessons for this course
        const { data: lessonData, error: lessonError } = await supabase
          .from('course_lessons')
          .select('id, title, description, sequence_order')
          .eq('course_id', courseId)
          .order('sequence_order', { ascending: true });
          
        if (lessonError) throw lessonError;
        setLessons(lessonData || []);
        
        // Try to fetch quizzes for this course
        try {
          // First check if quizzes table exists with the expected structure
          const { count, error: tableCheckError } = await supabase
            .from('quizzes')
            .select('*', { count: 'exact', head: true });
          
          if (tableCheckError) {
            console.error('Error checking quizzes table:', tableCheckError);
            if (tableCheckError.code === '42P01') {
              console.warn('Quizzes table does not exist. Skipping quiz fetching.');
              setQuizzes([]);
              return; // Exit early
            }
          } else {
            console.log('Quizzes table exists, proceeding with fetching');
          }
          
          // SIMPLIFIED DIRECT APPROACH: Just fetch all quizzes for this course
          console.log('Fetching quizzes directly for course ID:', courseId);
          const { data: directQuizData, error: directQuizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('course_id', courseId);
            
          if (directQuizError) {
            console.error('Error with direct quiz fetch:', directQuizError);
          } else {
            console.log('Direct quiz fetch result:', directQuizData?.length || 0, directQuizData);
            
            if (directQuizData && directQuizData.length > 0) {
              setQuizzes(directQuizData);
              
              // Try to fetch quiz results if we have quizzes
              await fetchQuizResults(directQuizData);
              return; // Exit early since we found quizzes
            }
          }
          
          // Fallback to lesson-based quizzes if the direct approach didn't find any
          const lessonIds = lessonData ? lessonData.map(lesson => lesson.id) : [];
          
          if (lessonIds.length > 0) {
            // Fetch quizzes associated with these lessons
            const { data: quizData, error: quizError } = await supabase
              .from('quizzes')
              .select('id, title, description, passing_score, lesson_id')
              .in('lesson_id', lessonIds)
              .order('created_at', { ascending: true });
            
            if (quizError) {
              console.error('Error fetching lesson-associated quizzes:', quizError);
            } else {
              console.log('Fetched lesson-associated quizzes:', quizData?.length || 0, quizData);
              
              if (quizData && quizData.length > 0) {
                setQuizzes(quizData);
                await fetchQuizResults(quizData);
                return; // Exit early if we found quizzes
              }
            }
          }
          
          // Last resort: try direct SQL query
          try {
            console.log('No quizzes found with standard queries, trying SQL fallback');
            const { data: sqlQuizzes, error: sqlError } = await fetchQuizzesBySQL(courseId);
            
            if (sqlError) {
              console.error('SQL fallback also failed:', sqlError);
              setQuizzes([]);
            } else if (sqlQuizzes && sqlQuizzes.length > 0) {
              console.log('SQL query found quizzes:', sqlQuizzes.length);
              setQuizzes(sqlQuizzes);
              await fetchQuizResults(sqlQuizzes);
            } else {
              console.log('No quizzes found even with SQL fallback');
              setQuizzes([]);
            }
          } catch (sqlFallbackError) {
            console.error('Final fallback also failed:', sqlFallbackError);
            setQuizzes([]);
          }
        } catch (quizFetchError) {
          console.error('Unexpected error fetching quizzes:', quizFetchError);
          setQuizzes([]);
        }
        
        // Rest of user progress fetching with better error handling
        try {
          // Try to fetch user course progress data
          const { data: userCourseData, error: userCourseError } = await supabase
            .from('user_courses')
            .select('progress, completed, last_accessed')
            .eq('user_id', profile.id)
            .eq('course_id', courseId)
            .single();
            
          if (userCourseError) {
            // Handle specific error codes
            if (userCourseError.code === 'PGRST116') {
              // No rows returned - this is fine, user hasn't started the course
              console.log('User has not started this course yet');
              setUserCourse(null);
            } else if (userCourseError.code === '42703' && userCourseError.message?.includes('last_accessed')) {
              // Column doesn't exist error - specifically for last_accessed
              console.warn('last_accessed column missing in user_courses table');
              
              // Try to add the column using the utility function
              await addLastAccessedColumn();
              
              // Fetch without that column
              const { data: limitedData, error: limitedError } = await supabase
                .from('user_courses')
                .select('progress, completed')
                .eq('user_id', profile.id)
                .eq('course_id', courseId)
                .single();
                
              if (!limitedError && limitedData) {
                // Use the data we have and set last_accessed to null
                setUserCourse({
                  ...limitedData,
                  last_accessed: null
                });
              } else if (limitedError && limitedError.code !== 'PGRST116') {
                console.error('Error fetching limited user course data:', limitedError);
              }
            } else {
              console.error('Error fetching user course progress:', userCourseError);
            }
          } else {
            setUserCourse(userCourseData);
          }
        } catch (progressError) {
          console.error('Error fetching user progress:', progressError);
          // Don't throw - allow the page to continue loading
        }
        
        // Fetch completed lessons with better error handling
        try {
          const { data: userLessonsData, error: userLessonsError } = await supabase
            .from('user_lessons')
            .select('lesson_id')
            .eq('user_id', profile.id)
            .eq('completed', true);
            
          if (userLessonsError) {
            if (userLessonsError.code === '42P01') {
              console.warn('user_lessons table does not exist');
              
              // Try to create the table
              const success = await createUserLessonsTable();
              if (success) {
                console.log('Successfully created user_lessons table');
              }
              
              // Start with empty completions since table was just created
              setCompletedLessons([]);
            } else {
              console.error('Error fetching completed lessons:', userLessonsError);
            }
          } else if (userLessonsData) {
            setCompletedLessons(userLessonsData.map(item => item.lesson_id));
          }
        } catch (lessonsError) {
          console.error('Error fetching completed lessons:', lessonsError);
          // Set to empty array as fallback
          setCompletedLessons([]);
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
        toast({
          title: t('app.error'),
          description: t('error.failedToLoad'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourseData();
  }, [courseId, profile, t]);
  
  const startOrContinueCourse = async () => {
    if (!profile || !courseId) return;
    
    try {
      // If user hasn't started the course yet
      if (!userCourse) {
        await supabase.from('user_courses').insert({
          user_id: profile.id,
          course_id: courseId,
          progress: 0,
          completed: false,
          last_accessed: new Date().toISOString()
        });
      } else {
        // Update last_accessed time
        await supabase.from('user_courses').update({
          last_accessed: new Date().toISOString()
        }).eq('user_id', profile.id).eq('course_id', courseId);
      }
      
      // Navigate to the first lesson if there are lessons
      if (lessons.length > 0) {
        navigate(`/courses/${courseId}/lessons`);
      } else {
        toast({
          title: t('courses.noLessons'),
          description: t('courses.noLessonsDescription'),
        });
      }
    } catch (error) {
      console.error('Error starting course:', error);
      toast({
        title: t('app.error'),
        description: t('error.failedToStart'),
        variant: "destructive",
      });
    }
  };
  
  const getDifficultyColor = (level: string | null) => {
    if (!level) return "bg-gray-500/20 text-gray-500";
    
    switch(level.toLowerCase()) {
      case 'beginner':
        return "bg-green-500/20 text-green-500";
      case 'intermediate':
        return "bg-blue-500/20 text-blue-500";
      case 'advanced':
        return "bg-orange-500/20 text-orange-500";
      case 'expert':
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };
  
  // Function to mark a lesson as completed
  const markLessonCompleted = async (lessonId: string, isCompleted: boolean) => {
    if (!profile || !courseId) {
      toast({
        title: t('app.error'),
        description: t('error.loginRequired'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isCompleted) {
        // Mark lesson as completed
        const { data, error } = await supabase
          .from('user_lessons')
          .upsert({
            user_id: profile.id,
            lesson_id: lessonId,
            course_id: courseId, // Make sure course_id is also included
            completed: true,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id, lesson_id' })
          .select();
          
        if (error) {
          console.error('Error marking lesson as completed:', error);
          throw error;
        }
        
        // Add to the completed lessons array
        if (!completedLessons.includes(lessonId)) {
          setCompletedLessons([...completedLessons, lessonId]);
        }
        
        // Lesson completion is a significant event, so check for achievements
        try {
          const { success, error } = await checkUserAchievements(profile.id);
          if (!success) {
            console.error('Error checking achievements after lesson completion:', error);
          } else {
            console.log('Successfully checked achievements for lesson completion');
          }
        } catch (achievementError) {
          console.error('Exception during lesson achievement check:', achievementError);
          // Don't rethrow - we don't want to break the lesson completion process
        }
      } else {
        // Mark lesson as not completed
        const { error } = await supabase
          .from('user_lessons')
          .delete()
          .match({ user_id: profile.id, lesson_id: lessonId });
          
        if (error) {
          console.error('Error marking lesson as incomplete:', error);
          throw error;
        }
        
        // Remove from the completed lessons array
        setCompletedLessons(completedLessons.filter(id => id !== lessonId));
      }
      
      // Update overall course progress
      await updateCourseProgress();
      
      toast({
        title: isCompleted ? t('success.lessonCompleted') : t('courses.markAsIncomplete'),
        description: t('success.progressUpdated'),
      });
    } catch (error) {
      console.error('Error updating lesson status:', error);
      toast({
        title: t('app.error'),
        description: t('error.failedToUpdate'),
        variant: "destructive",
      });
    }
  };

  // Function to calculate and update overall course progress
  const updateCourseProgress = async () => {
    if (!profile || !courseId || !course) return;
    
    try {
      // Calculate percentage based on completed lessons and quizzes
      const totalLessons = lessons.length;
      const totalQuizzes = quizzes.length;
      const totalItems = totalLessons + totalQuizzes;
      
      if (totalItems === 0) {
        console.log('No lessons or quizzes to calculate progress with');
        return; // Avoid division by zero
      }
      
      const completedLessonsCount = completedLessons.length;
      const completedQuizzesCount = completedQuizzes.length;
      const completedItems = completedLessonsCount + completedQuizzesCount;
      
      const progress = Math.round((completedItems / totalItems) * 100);
      const isComplete = progress === 100;
      
      console.log(`Updating course progress: ${completedItems}/${totalItems} items completed (${progress}%)`);
      console.log(`Lessons: ${completedLessonsCount}/${totalLessons}, Quizzes: ${completedQuizzesCount}/${totalQuizzes}`);
      
      // Check if this is a course completion event (progress reaching 100%)
      const wasAlreadyComplete = userCourse?.completed || false;
      const isNewCompletion = isComplete && !wasAlreadyComplete;
      
      console.log(`Course completion status: isComplete=${isComplete}, wasAlreadyComplete=${wasAlreadyComplete}, isNewCompletion=${isNewCompletion}`);
      
      // Update user_courses record
      const { data: updatedCourse, error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: profile.id,
          course_id: courseId,
          progress: progress,
          completed: isComplete,
          last_accessed: new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null
        }, { onConflict: 'user_id, course_id' })
        .select();
        
      if (error) {
        console.error('Error updating course progress in database:', error);
        throw error;
      }
      
      console.log('Database update successful:', updatedCourse);
      
      // Update local state
      setUserCourse(prev => ({
        ...prev || { completed: false, last_accessed: null },
        progress: progress,
        completed: isComplete,
        last_accessed: new Date().toISOString()
      }));
      
      // Handle course completion achievements and notifications
      if (isNewCompletion) {
        console.log(`Course completion detected! Course ID: ${courseId}, Progress: ${progress}%`);
        
        // Award points for course completion first (this is more reliable than achievements)
        try {
          const { success: pointsSuccess, error: pointsError } = await awardPoints(
            profile.id,
            100, // Points for course completion
            `Completed course: ${course.title}`,
            'course_completion',
            courseId
          );
          
          if (!pointsSuccess) {
            console.error('Error awarding points for course completion:', pointsError);
          } else {
            console.log('Successfully awarded points for course completion');
            
            // Show toast for awarded points
            toast({
              title: 'Points Awarded! 🎉',
              description: `You've earned 100 points for completing ${course.title}`,
              variant: "default",
            });
          }
        } catch (pointsError) {
          console.error('Exception awarding points:', pointsError);
        }
        
        // Call the achievements check function to update course completion achievements
        try {
          const { success, error } = await checkUserAchievements(profile.id);
          
          if (!success) {
            console.error('Error checking achievements:', error);
          } else {
            console.log('Successfully checked achievements for course completion');
            
            // Show toast for course completion
            toast({
              title: 'Course Completed! 🎉',
              description: 'You may have unlocked new achievements. Check your profile!',
              variant: "default",
            });
          }
        } catch (achievementError) {
          console.error('Exception during achievement check:', achievementError);
        }
      }
    } catch (error) {
      console.error('Error updating course progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to update course progress. Please try again.',
        variant: "destructive",
      });
    }
  };
  
  // Create a quiz if none exist yet (admin only)
  const createSampleQuiz = async () => {
    if (profile?.role !== 'admin' || !courseId) return;
    
    try {
      toast({
        title: 'Creating Sample Quiz',
        description: 'Attempting to create a sample quiz for this course...',
      });
      
      // First check if quizzes table exists
      const quizzesTableExists = await checkTableExists('quizzes');
      console.log('Quizzes table exists:', quizzesTableExists);
      
      if (!quizzesTableExists) {
        console.log('Quizzes table does not exist, creating minimal structure');
        // Try to create a minimal quiz structure
        const created = await createMinimalQuizStructure();
        if (!created) {
          console.error('Failed to create minimal quiz structure');
          // Fall back to direct creation using the REST API
          await createQuizDirectly();
          return;
        }
      }
      
      // Ensure user_quiz_results table exists
      const userQuizResultsExists = await checkTableExists('user_quiz_results');
      console.log('user_quiz_results table exists:', userQuizResultsExists);
      
      if (!userQuizResultsExists) {
        console.log('Creating user_quiz_results table');
        await createUserQuizResultsTable();
      }
      
      // Use the utility function to create a sample quiz
      console.log('Calling createSampleQuizForCourse for course:', courseId);
      const success = await createSampleQuizForCourse(courseId, profile.id);
      
      if (success) {
        console.log('Sample quiz created successfully');
        
        // Associate the newly created quiz with a lesson if there are lessons
        if (lessons.length > 0) {
          console.log('Associating quiz with lessons');
          await associateQuizzesWithLessons(courseId);
        }
        
        toast({
          title: 'Quiz Created',
          description: 'Sample quiz has been created for this course and associated with a lesson.',
        });
        
        // Refresh the page to load the new quiz
        console.log('Reloading page to show new quiz');
        window.location.reload();
      } else {
        console.error('Failed to create sample quiz');
        throw new Error('Failed to create sample quiz');
      }
    } catch (error) {
      console.error('Error creating sample quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to create sample quiz. Please check if tables exist.',
        variant: 'destructive'
      });
    }
  };
  
  // Create user_quiz_results table if it doesn't exist
  const createUserQuizResultsTable = async (): Promise<boolean> => {
    try {
      console.log('Creating user_quiz_results table');
      
      // First check if the RPC exists and try to use it
      await ensureCreateUserQuizResultsRPC();
      const { error } = await supabase.rpc('create_user_quiz_results_table');
      
      if (error) {
        console.error('Error creating user_quiz_results table via RPC:', error);
        
        // Fallback: try to see if the table already exists by attempting insertion
        console.log('Checking if table exists by attempting a test insertion');
        
        // Create test data
        const testData = {
          user_id: profile?.id || '00000000-0000-0000-0000-000000000000',
          quiz_id: '00000000-0000-0000-0000-000000000000',
          course_id: courseId || '00000000-0000-0000-0000-000000000000',
          score: 0,
          passed: false
        };
        
        // Try to insert
        const { error: insertError } = await supabase
          .from('user_quiz_results')
          .insert(testData);
          
        if (insertError) {
          if (insertError.code === '42P01') {
            // Table doesn't exist and we can't create it
            console.error('Table user_quiz_results does not exist and cannot be created via REST API');
            toast({
              title: 'Database Error',
              description: 'Required quiz tables do not exist. Please run the database migrations.',
              variant: 'destructive'
            });
            return false;
          } else {
            // Other error, but the table might exist
            console.log('Table exists but insert failed for other reasons:', insertError);
            return true;
          }
        } else {
          // Success, so delete the test data
          console.log('Test insertion successful, cleaning up');
          await supabase
            .from('user_quiz_results')
            .delete()
            .eq('quiz_id', '00000000-0000-0000-0000-000000000000');
            
          return true;
        }
      }
      
      console.log('Successfully created user_quiz_results table via RPC');
      return true;
    } catch (error) {
      console.error('Exception creating user_quiz_results table:', error);
      return false;
    }
  };
  
  // Fallback function to create a quiz directly when the table doesn't exist
  const createQuizDirectly = async () => {
    try {
      // Create a fallback quiz object to display even if the database table doesn't exist
      const newQuiz = {
        id: 'temp-' + Date.now(),
        title: 'Sample Quiz',
        description: 'This is a temporary sample quiz to test knowledge',
        passing_score: 70,
        lesson_id: null as string | null
      };
      
      // Update state directly
      setQuizzes([...quizzes, newQuiz]);
      
      toast({
        title: 'Quiz Created',
        description: 'A temporary quiz has been created. Note: This is just for display purposes.',
      });
    } catch (error) {
      console.error('Error creating direct quiz:', error);
      toast({
        title: 'Error',
        description: 'Could not create even a temporary quiz.',
        variant: 'destructive'
      });
    }
  };
  
  const fetchQuizResults = async (quizzes: Quiz[]) => {
    if (!profile || !courseId || quizzes.length === 0) {
      console.log('Cannot fetch quiz results - missing prerequisites or no quizzes');
      return;
    }
    
    console.log('Fetching quiz results for', quizzes.length, 'quizzes. Quiz IDs:', quizzes.map(q => q.id));
    
    try {
      // First check if user_quiz_results table exists
      const { count, error: tableCheckError } = await supabase
        .from('user_quiz_results')
        .select('*', { count: 'exact', head: true });
        
      if (tableCheckError) {
        console.error('Error checking user_quiz_results table:', tableCheckError);
        if (tableCheckError.code === '42P01') {
          console.warn('user_quiz_results table does not exist.');
          return;
        }
      }
      
      // Fetch quiz results
      const { data: userQuizzesData, error: userQuizzesError } = await supabase
        .from('user_quiz_results')
        .select('quiz_id, score, passed')
        .eq('user_id', profile.id);
        
      if (userQuizzesError) {
        console.error('Error fetching user quiz results:', userQuizzesError);
        return;
      }
      
      console.log('Fetched user quiz results:', userQuizzesData?.length || 0, userQuizzesData);
        
      if (userQuizzesData && userQuizzesData.length > 0) {
        // Filter to only include passed quizzes
        const passedQuizzes = userQuizzesData.filter(result => result.passed);
        console.log('Passed quizzes:', passedQuizzes.length, passedQuizzes);
        
        // Update the completedQuizzes state
        setCompletedQuizzes(passedQuizzes.map(item => item.quiz_id));
        
        // Append score to quizzes
        const quizzesWithScore = quizzes.map(quiz => {
          const result = userQuizzesData.find(r => r.quiz_id === quiz.id);
          const updatedQuiz = {
            ...quiz,
            completed: result?.passed || false,
            score: result?.score || null
          };
          console.log(`Quiz ${quiz.id} (${quiz.title}) - completed: ${updatedQuiz.completed}, score: ${updatedQuiz.score}`);
          return updatedQuiz;
        });
        
        console.log('Setting quizzes with scores:', quizzesWithScore);
        setQuizzes(quizzesWithScore);
        
        // Update course progress after updating quiz results
        await updateCourseProgress();
      } else {
        console.log('No quiz results found for the user');
      }
    } catch (resultsError) {
      console.error('Error fetching quiz results:', resultsError);
    }
  };
  
  // Utility function to fix database tables
  const fixDatabaseTables = async () => {
    if (!profile || profile.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can fix database tables',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Database Fix',
      description: 'Attempting to fix quiz database tables...',
    });
    
    try {
      // First check quiz tables
      const quizTablesFixed = await ensureQuizTablesExist();
      
      if (!quizTablesFixed) {
        throw new Error('Failed to create quiz tables');
      }
      
      // Try to create a sample quiz to verify everything works
      if (courseId) {
        const success = await createSampleQuizForCourse(courseId, profile.id);
        if (success) {
          toast({
            title: 'Success',
            description: 'Database tables fixed and sample quiz created. Refreshing page.',
          });
          
          // Refresh to see new quiz
          window.location.reload();
        } else {
          throw new Error('Fixed tables but could not create quiz');
        }
      }
    } catch (error) {
      console.error('Error fixing database tables:', error);
      toast({
        title: 'Database Error',
        description: 'Could not fix database tables. Please run SQL migrations.',
        variant: 'destructive'
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">{t('courses.notFound')}</h3>
          <p className="mt-1 text-muted-foreground">{t('courses.notFoundDescription')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/courses')}>
            {t('courses.backToCourses')}
          </Button>
        </div>
      </div>
    );
  }
  
  // Log current state for debugging
  console.log('Rendering CourseDetail with:', {
    'course': course.title,
    'lessons': lessons.length,
    'quizzes': quizzes.length,
    'quizzesSample': quizzes.slice(0, 2),
    'completedLessons': completedLessons.length,
    'completedQuizzes': completedQuizzes.length,
  });
  
  const isEnrolled = !!userCourse;
  const isCompleted = userCourse?.completed || false;
  
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button 
              className="text-muted-foreground hover:text-foreground" 
              onClick={() => navigate('/courses')}
            >
              {t('courses.title')}
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium truncate">{course.title}</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            
            <div className="flex items-center gap-2">
              {course.difficulty_level && (
                <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
                  {course.difficulty_level}
                </Badge>
              )}
              
              {course.category && (
                <Badge variant="secondary">
                  {course.category}
                </Badge>
              )}
            </div>
          </div>
          
          {course.description && (
            <div className="prose dark:prose-invert max-w-none mb-8">
              <p>{course.description}</p>
            </div>
          )}
          
          {/* Course stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <Layers className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.lessons')}</span>
              <span className="text-2xl font-bold">{lessons.length}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <Award className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.quizzes')}</span>
              <span className="text-2xl font-bold">{quizzes.length}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <Clock className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.difficulty')}</span>
              <span className="text-2xl font-bold">{course.estimated_hours || 'N/A'} {t('courses.hours')}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
              <BarChart className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground">{t('courses.progress')}</span>
              <span className="text-2xl font-bold">{userCourse?.progress || 0}%</span>
            </div>
          </div>
          
          {/* Tabs for lessons and quizzes */}
          <Tabs defaultValue="lessons" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="lessons">{t('courses.lessons')}</TabsTrigger>
              <TabsTrigger value="quizzes">{t('courses.quizzes')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lessons">
              {lessons.length > 0 ? (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    
                    return (
                      <Card key={lesson.id} className={isCompleted ? "border-green-200" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center">
                                <span className="mr-2">Lesson {index + 1}:</span> {lesson.title}
                              </CardTitle>
                              {lesson.description && (
                                <CardDescription className="mt-1">{lesson.description}</CardDescription>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`lesson-${lesson.id}`}
                                checked={isCompleted}
                                onCheckedChange={(checked) => markLessonCompleted(lesson.id, !!checked)}
                                className="data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
                              />
                              <label 
                                htmlFor={`lesson-${lesson.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {isCompleted ? t('courses.completed') : t('courses.markAsCompleted')}
                              </label>
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter className="flex justify-between">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/courses/${courseId}/lessons`)}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {isCompleted ? t('courses.review') : t('courses.continue')}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">{t('courses.noLessons')}</h3>
                  <p className="mt-1 text-muted-foreground">{t('courses.noLessonsDescription')}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="quizzes" className="space-y-4">
              {quizzes && quizzes.length > 0 ? (
                <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const isCompleted = completedQuizzes.includes(quiz.id);
                    
                    return (
                      <Card key={quiz.id} className={isCompleted ? "border-green-200" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{quiz.title}</CardTitle>
                              {quiz.description && (
                                <CardDescription className="mt-1">{quiz.description}</CardDescription>
                              )}
                              {quiz.lesson_id && (
                                <div className="mt-1 text-sm font-medium text-muted-foreground">
                                  Lesson: {lessons.find(l => l.id === quiz.lesson_id)?.title || 'Unknown lesson'}
                                </div>
                              )}
                              {quiz.passing_score && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  Passing score: {quiz.passing_score}%
                                </div>
                              )}
                              {isCompleted && quiz.score !== null && (
                                <div className="mt-1 text-sm font-medium text-green-600">
                                  Your score: {quiz.score}%
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              {isCompleted ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 mb-2">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Passed
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full sm:w-auto"
                            onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}
                          >
                            {isCompleted ? t('courses.review') : t('courses.take')}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 border rounded-lg p-4">
                  <p className="text-center text-gray-500">
                    {t('courses.noQuizzes')}
                  </p>
                  {profile?.role === 'admin' && (
                    <div className="mt-4 flex flex-col gap-2">
                      <Button 
                        onClick={createSampleQuiz}
                        className="mt-2"
                      >
                        Create Sample Quiz
                      </Button>
                      <Button 
                        onClick={fixDatabaseTables}
                        variant="outline"
                      >
                        Fix Database Tables
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('courses.progress')}</CardTitle>
              <CardDescription>
                {isEnrolled 
                  ? "Track your learning journey" 
                  : "Start this course to track your progress"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEnrolled ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{t('courses.progress')}</span>
                      <span className="text-sm font-medium">{userCourse.progress}%</span>
                    </div>
                    <Progress value={userCourse.progress} className="h-2" />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('courses.lessons')} {t('courses.completed').toLowerCase()}</span>
                      <span className="font-medium">{completedLessons.length} / {lessons.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('courses.quizzes')} {t('quiz.passed').toLowerCase()}</span>
                      <span className="font-medium">{completedQuizzes.length} / {quizzes.length}</span>
                    </div>
                    
                    {userCourse.last_accessed && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Last accessed</span>
                        <span className="font-medium">{new Date(userCourse.last_accessed).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">Enroll in this course to start tracking your progress</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex flex-col gap-2">
                <Button 
                  className="w-full" 
                  variant={isCompleted ? "outline" : "default"}
                  onClick={startOrContinueCourse}
                >
                  {!isEnrolled ? t('courses.enroll') : 
                    isCompleted ? t('courses.review') : t('courses.continue')}
                </Button>
                
                {isEnrolled && !isCompleted && (
                  <Button 
                    className="w-full"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        // Mark all lessons as completed
                        for (const lesson of lessons) {
                          if (!completedLessons.includes(lesson.id)) {
                            await supabase.from('user_lessons').upsert({
                              user_id: profile.id,
                              lesson_id: lesson.id,
                              course_id: courseId,
                              completed: true,
                              progress: 100,
                              completed_at: new Date().toISOString()
                            }, { onConflict: 'user_id, lesson_id' });
                          }
                        }
                        
                        // Mark all quizzes as completed with default passing score
                        for (const quiz of quizzes) {
                          if (!completedQuizzes.includes(quiz.id)) {
                            try {
                              await supabase.from('user_quiz_results').upsert({
                                user_id: profile.id,
                                quiz_id: quiz.id,
                                course_id: courseId,
                                score: quiz.passing_score || 80,
                                passed: true,
                                completed_at: new Date().toISOString()
                              }, { onConflict: 'user_id, quiz_id' });
                            } catch (error) {
                              console.error('Error marking quiz as complete:', error);
                            }
                          }
                        }
                        
                        // Calculate total items and completed items
                        const totalItems = lessons.length + quizzes.length;
                        const completedItems = totalItems; // Since we're marking everything as complete
                        const progress = Math.round((completedItems / totalItems) * 100);
                        
                        // Update user_courses record
                        await supabase.from('user_courses').upsert({
                          user_id: profile.id,
                          course_id: courseId,
                          progress: progress,
                          completed: true,
                          last_accessed: new Date().toISOString(),
                          completed_at: new Date().toISOString()
                        }, { onConflict: 'user_id, course_id' });
                        
                        // Update local states
                        setCompletedLessons(lessons.map(lesson => lesson.id));
                        setCompletedQuizzes(quizzes.map(quiz => quiz.id));
                        setUserCourse(prev => ({
                          ...prev || { last_accessed: null },
                          progress: progress,
                          completed: true,
                          last_accessed: new Date().toISOString()
                        }));
                        
                        // Award points and check achievements
                        try {
                          // Award points for course completion
                          const { success: pointsSuccess, error: pointsError } = await awardPoints(
                            profile.id,
                            100, // Points for course completion
                            `Completed course: ${course.title}`,
                            'course_completion',
                            courseId
                          );
                          
                          if (!pointsSuccess) {
                            console.error('Error awarding points for bulk course completion:', pointsError);
                          } else {
                            toast({
                              title: 'Points Awarded! 🎉',
                              description: `You've earned 100 points for completing ${course.title}`,
                              variant: "default",
                            });
                          }
                          
                          // Check for achievements
                          const { success, error } = await checkUserAchievements(profile.id);
                          if (!success) {
                            console.error('Error checking achievements after bulk completion:', error);
                          } else {
                            toast({
                              title: 'Course Completed! 🎉',
                              description: 'You may have unlocked new achievements. Check your profile!',
                              variant: "default",
                            });
                          }
                        } catch (achievementError) {
                          console.error('Error processing achievements after bulk completion:', achievementError);
                        }
                      } catch (error) {
                        console.error('Error completing course:', error);
                        toast({
                          title: t('app.error'),
                          description: t('error.failedToUpdate'),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {t('courses.markAsCompleted')}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
          
          {course.related_skill && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Related Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="mr-2">
                  {course.related_skill}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 