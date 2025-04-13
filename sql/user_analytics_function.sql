-- Function to get comprehensive user analytics data
-- This should be executed in your Supabase SQL editor

DROP FUNCTION IF EXISTS public.get_user_analytics(uuid, text);
DROP FUNCTION IF EXISTS public.get_user_analytics(uuid);

CREATE OR REPLACE FUNCTION public.get_user_analytics(
  p_user_id UUID,
  p_time_range TEXT DEFAULT 'month'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Changed from INVOKER to DEFINER for Supabase compatibility
SET search_path = public
AS $$
DECLARE
  start_date TIMESTAMP;
  v_user RECORD;
  v_result JSON;
  v_course_distribution JSON;
  v_recent_activities JSON;
  course_enrollments INT;
  completed_courses INT;
  in_progress_courses INT;
  avg_progress NUMERIC;
  total_lessons_completed INT;
  total_quizzes_attempted INT;
  avg_quiz_score NUMERIC;
  total_seconds INT;
  last_activity TIMESTAMP;
BEGIN
  -- Set the time range filter
  CASE p_time_range
    WHEN 'week' THEN start_date := NOW() - INTERVAL '7 days';
    WHEN 'month' THEN start_date := NOW() - INTERVAL '30 days';
    WHEN 'year' THEN start_date := NOW() - INTERVAL '1 year';
    ELSE start_date := '1970-01-01'::TIMESTAMP; -- 'all' time
  END CASE;

  -- Get basic user info - Changed to use RECORD type instead of profiles
  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Count course enrollments and calculate stats
  SELECT 
    COUNT(DISTINCT e.course_id) AS total_enrolled,
    SUM(CASE WHEN e.progress = 100 THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN e.progress > 0 AND e.progress < 100 THEN 1 ELSE 0 END) AS in_progress,
    COALESCE(AVG(e.progress), 0) AS avg_course_progress
  INTO 
    course_enrollments, 
    completed_courses,
    in_progress_courses,
    avg_progress
  FROM 
    course_enrollments e
  WHERE 
    e.user_id = p_user_id
    AND (e.created_at >= start_date OR p_time_range = 'all');

  -- Count completed lessons
  SELECT 
    COUNT(*)
  INTO 
    total_lessons_completed
  FROM 
    lesson_progress lp
  WHERE 
    lp.user_id = p_user_id
    AND lp.completed = true
    AND (lp.completed_at >= start_date OR p_time_range = 'all');

  -- Count quiz attempts and calculate average score
  SELECT 
    COUNT(*),
    COALESCE(AVG(score), 0)
  INTO 
    total_quizzes_attempted,
    avg_quiz_score
  FROM 
    quiz_attempts qa
  WHERE 
    qa.user_id = p_user_id
    AND (qa.attempted_at >= start_date OR p_time_range = 'all');

  -- Calculate total time spent
  SELECT 
    COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))), 0)::INT
  INTO 
    total_seconds
  FROM 
    user_activity_sessions
  WHERE 
    user_id = p_user_id
    AND (start_time >= start_date OR p_time_range = 'all');

  -- Find last activity date
  SELECT 
    MAX(activity_time)
  INTO 
    last_activity
  FROM (
    SELECT MAX(completed_at) AS activity_time FROM lesson_progress WHERE user_id = p_user_id
    UNION
    SELECT MAX(attempted_at) AS activity_time FROM quiz_attempts WHERE user_id = p_user_id
    UNION
    SELECT MAX(last_accessed) AS activity_time FROM course_enrollments WHERE user_id = p_user_id
  ) activities;
  
  -- Get course distribution
  SELECT 
    json_object_agg(
      c.title,
      json_build_object(
        'progress', e.progress,
        'last_accessed', e.last_accessed,
        'completed_lessons', (
          SELECT COUNT(*) 
          FROM lesson_progress lp 
          JOIN lessons l ON l.id = lp.lesson_id
          WHERE lp.user_id = p_user_id AND l.course_id = c.id AND lp.completed = true
        )
      )
    )
  INTO 
    v_course_distribution
  FROM 
    course_enrollments e
    JOIN courses c ON c.id = e.course_id
  WHERE 
    e.user_id = p_user_id
    AND (e.created_at >= start_date OR p_time_range = 'all')
  GROUP BY 
    e.user_id;
    
  -- Get recent activities
  WITH recent_activities AS (
    -- Lesson completions
    SELECT 
      'lesson_complete' AS type,
      lp.completed_at AS timestamp,
      json_build_object(
        'lesson_name', l.title,
        'course_name', c.title,
        'current_progress', e.progress,
        'previous_progress', (
          SELECT progress
          FROM course_progress_history
          WHERE user_id = p_user_id AND course_id = c.id AND recorded_at < lp.completed_at
          ORDER BY recorded_at DESC
          LIMIT 1
        )
      ) AS metadata
    FROM 
      lesson_progress lp
      JOIN lessons l ON l.id = lp.lesson_id
      JOIN courses c ON c.id = l.course_id
      JOIN course_enrollments e ON e.course_id = c.id AND e.user_id = lp.user_id
    WHERE 
      lp.user_id = p_user_id 
      AND lp.completed = true
      AND (lp.completed_at >= start_date OR p_time_range = 'all')
    
    UNION ALL
    
    -- Quiz attempts
    SELECT 
      'quiz_attempt' AS type,
      qa.attempted_at AS timestamp,
      json_build_object(
        'quiz_name', q.title,
        'course_name', c.title,
        'score', qa.score,
        'current_progress', e.progress,
        'previous_progress', (
          SELECT progress
          FROM course_progress_history
          WHERE user_id = p_user_id AND course_id = c.id AND recorded_at < qa.attempted_at
          ORDER BY recorded_at DESC
          LIMIT 1
        )
      ) AS metadata
    FROM 
      quiz_attempts qa
      JOIN quizzes q ON q.id = qa.quiz_id
      JOIN courses c ON c.id = q.course_id
      JOIN course_enrollments e ON e.course_id = c.id AND e.user_id = qa.user_id
    WHERE 
      qa.user_id = p_user_id
      AND (qa.attempted_at >= start_date OR p_time_range = 'all')
    
    UNION ALL
    
    -- Course views (from activity logs)
    SELECT 
      'course_view' AS type,
      al.created_at AS timestamp,
      json_build_object(
        'course_name', c.title,
        'current_progress', e.progress,
        'previous_progress', (
          SELECT progress
          FROM course_progress_history
          WHERE user_id = p_user_id AND course_id = c.id AND recorded_at < al.created_at
          ORDER BY recorded_at DESC
          LIMIT 1
        )
      ) AS metadata
    FROM 
      activity_logs al
      JOIN courses c ON c.id = al.resource_id
      JOIN course_enrollments e ON e.course_id = c.id AND e.user_id = al.user_id
    WHERE 
      al.user_id = p_user_id
      AND al.resource_type = 'course'
      AND al.action = 'view'
      AND (al.created_at >= start_date OR p_time_range = 'all')
  )
  SELECT 
    json_agg(
      json_build_object(
        'type', type,
        'timestamp', timestamp,
        'metadata', metadata
      )
      ORDER BY timestamp DESC
      LIMIT 10
    )
  INTO 
    v_recent_activities
  FROM 
    recent_activities;
  
  -- Build final result
  v_result := json_build_object(
    'total_courses_enrolled', course_enrollments,
    'completed_courses', completed_courses,
    'in_progress_courses', in_progress_courses,
    'average_course_progress', ROUND(avg_progress::NUMERIC, 1),
    'total_lessons_completed', total_lessons_completed,
    'total_quizzes_attempted', total_quizzes_attempted,
    'average_quiz_score', ROUND(avg_quiz_score::NUMERIC, 1),
    'total_time_spent', total_seconds,
    'last_activity_date', last_activity,
    'course_distribution', COALESCE(v_course_distribution, '{}'::JSON),
    'recent_activities', COALESCE(v_recent_activities, '[]'::JSON)
  );
  
  RETURN v_result;
END;
$$;

-- Required permissions (make sure to run these)
GRANT EXECUTE ON FUNCTION public.get_user_analytics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_analytics(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_analytics(UUID, TEXT) TO service_role;

-- Example usage:
-- SELECT get_user_analytics('user-uuid-here'::uuid, 'month');

-- Sample test queries
-- SELECT get_user_analytics('00000000-0000-0000-0000-000000000000'::uuid);
-- SELECT get_user_analytics('00000000-0000-0000-0000-000000000000'::uuid, 'week'); 