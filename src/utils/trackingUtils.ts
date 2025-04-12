import { supabase } from '@/integrations/supabase/client';

/**
 * Track when a user views a lesson
 * @param userId User ID
 * @param lessonId Lesson ID
 * @param courseId Course ID
 * @param duration Time spent in seconds (optional)
 */
export async function trackLessonView(
  userId: string,
  lessonId: string,
  courseId: string,
  duration?: number
) {
  try {
    // First check if an entry already exists
    const { data: existingEntry, error: checkError } = await supabase
      .from('lesson_views')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing lesson view:', checkError);
      return { error: checkError };
    }
    
    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('lesson_views')
        .update({
          view_count: (existingEntry.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
          total_duration: (existingEntry.total_duration || 0) + (duration || 0)
        })
        .eq('id', existingEntry.id);
      
      if (error) throw error;
      return { data };
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('lesson_views')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          view_count: 1,
          first_viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          total_duration: duration || 0
        });
      
      if (error) throw error;
      return { data };
    }
  } catch (error) {
    console.error('Error tracking lesson view:', error);
    return { error };
  }
}

/**
 * Track when a user completes a lesson
 * @param userId User ID
 * @param lessonId Lesson ID
 * @param courseId Course ID
 * @param complete Whether the lesson is completed
 */
export async function trackLessonCompletion(
  userId: string,
  lessonId: string,
  courseId: string,
  complete: boolean = true
) {
  try {
    // Check if user_lessons entry exists
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_lessons')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing lesson progress:', checkError);
      return { error: checkError };
    }
    
    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('user_lessons')
        .update({
          completed: complete,
          completed_at: complete ? new Date().toISOString() : null,
        })
        .eq('id', existingProgress.id);
      
      if (error) throw error;
      return { data };
    } else {
      // Create new progress entry
      const { data, error } = await supabase
        .from('user_lessons')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          progress: complete ? 100 : 0,
          completed: complete,
          started_at: new Date().toISOString(),
          completed_at: complete ? new Date().toISOString() : null
        });
      
      if (error) throw error;
      return { data };
    }
  } catch (error) {
    console.error('Error tracking lesson completion:', error);
    return { error };
  }
}

/**
 * Update user progress in a course based on lessons completed
 * @param userId User ID
 * @param courseId Course ID
 */
export async function updateCourseProgress(userId: string, courseId: string) {
  try {
    // Get total lessons for the course
    const { data: totalLessons, error: totalError } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('course_id', courseId);
    
    if (totalError) throw totalError;
    
    if (!totalLessons || totalLessons.length === 0) {
      console.warn('No lessons found for course:', courseId);
      return;
    }
    
    // Get completed lessons
    const { data: completedLessons, error: completedError } = await supabase
      .from('user_lessons')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', totalLessons.map(l => l.id));
    
    if (completedError) throw completedError;
    
    // Calculate progress percentage
    const totalCount = totalLessons.length;
    const completedCount = completedLessons?.length || 0;
    const progressPercentage = Math.round((completedCount / totalCount) * 100);
    
    // Update user_courses table
    const { data: userCourse, error: courseCheckError } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (courseCheckError) throw courseCheckError;
    
    if (userCourse) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('user_courses')
        .update({
          progress: progressPercentage,
          completed: progressPercentage === 100,
          completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
          last_accessed: new Date().toISOString()
        })
        .eq('id', userCourse.id);
      
      if (updateError) throw updateError;
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('user_courses')
        .insert({
          user_id: userId,
          course_id: courseId,
          progress: progressPercentage,
          completed: progressPercentage === 100,
          completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
          started_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        });
      
      if (insertError) throw insertError;
    }
    
    return { progress: progressPercentage };
  } catch (error) {
    console.error('Error updating course progress:', error);
    return { error };
  }
}

/**
 * Update lesson progress manually (self-reported progress)
 * @param userId User ID
 * @param lessonId Lesson ID
 * @param courseId Course ID
 * @param progressPercent Progress percentage (0-100)
 */
export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  courseId: string,
  progressPercent: number
) {
  try {
    // Validate progress percentage
    const progress = Math.max(0, Math.min(100, progressPercent));
    const completed = progress === 100;
    
    // Check if user_lessons entry exists
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_lessons')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing lesson progress:', checkError);
      return { error: checkError };
    }
    
    let result;
    
    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('user_lessons')
        .update({
          progress: progress,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : existingProgress.completed_at,
        })
        .eq('id', existingProgress.id);
      
      if (error) throw error;
      result = { data };
    } else {
      // Create new progress entry
      const { data, error } = await supabase
        .from('user_lessons')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          progress: progress,
          completed: completed,
          started_at: new Date().toISOString(),
          completed_at: completed ? new Date().toISOString() : null
        });
      
      if (error) throw error;
      result = { data };
    }
    
    // Update the overall course progress
    await updateCourseProgress(userId, courseId);
    
    return result;
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    return { error };
  }
}

/**
 * Get detailed progress for a user across all courses
 * @param userId User ID
 */
export async function getUserProgressSummary(userId: string) {
  try {
    // Get all user courses with progress
    const { data: userCourses, error: coursesError } = await supabase
      .from('user_courses')
      .select(`
        *,
        courses:course_id (
          id,
          title,
          description,
          image_url,
          difficulty_level
        )
      `)
      .eq('user_id', userId);
    
    if (coursesError) throw coursesError;
    
    // Get lesson completion stats
    const { data: lessonStats, error: lessonError } = await supabase
      .from('user_lessons')
      .select('course_id, completed')
      .eq('user_id', userId);
    
    if (lessonError) throw lessonError;
    
    // Get quiz results
    const { data: quizResults, error: quizError } = await supabase
      .from('user_quiz_results')
      .select('*')
      .eq('user_id', userId);
    
    if (quizError) throw quizError;
    
    // Process and organize the data
    const courses = userCourses || [];
    
    // Group lesson stats by course
    const lessonStatsByCourse = (lessonStats || []).reduce((acc, stat) => {
      if (!acc[stat.course_id]) {
        acc[stat.course_id] = {
          total: 0,
          completed: 0
        };
      }
      
      acc[stat.course_id].total += 1;
      if (stat.completed) {
        acc[stat.course_id].completed += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);
    
    // Calculate average quiz score by user
    const totalQuizzes = quizResults?.length || 0;
    const passedQuizzes = quizResults?.filter(q => q.passed)?.length || 0;
    const averageScore = totalQuizzes > 0
      ? quizResults!.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes
      : 0;
    
    return {
      courses: courses.map(course => ({
        ...course,
        lessonStats: lessonStatsByCourse[course.course_id] || { total: 0, completed: 0 }
      })),
      quizStats: {
        total: totalQuizzes,
        passed: passedQuizzes,
        averageScore
      },
      overallProgress: courses.length > 0
        ? courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length
        : 0
    };
  } catch (error) {
    console.error('Error getting user progress summary:', error);
    return { error };
  }
} 