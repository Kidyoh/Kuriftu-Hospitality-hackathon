-- Script to update achievements schema and data

-- Add required_progress column if it doesn't exist in achievements table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'required_progress'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN required_progress INTEGER DEFAULT 100;
    END IF;
END
$$;

-- Add title column if it doesn't exist (convert from name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'title'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN title VARCHAR(255);
        
        -- Copy name to title if name exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'name'
        ) THEN
            UPDATE public.achievements SET title = name;
        END IF;
    END IF;
END
$$;

-- Add icon column if it doesn't exist (convert from icon_url)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'icon'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN icon VARCHAR(255);
        
        -- Copy icon_url to icon if icon_url exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'icon_url'
        ) THEN
            UPDATE public.achievements SET icon = icon_url;
        END IF;
    END IF;
END
$$;

-- Add category column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN category VARCHAR(50) DEFAULT 'general';
    END IF;
END
$$;

-- Set required_progress based on criteria
UPDATE public.achievements
SET required_progress = 
    CASE
        WHEN criteria->>'type' = 'course_completion' THEN (criteria->>'count')::INTEGER * 100
        WHEN criteria->>'type' = 'lesson_completion' THEN (criteria->>'count')::INTEGER * 100
        WHEN criteria->>'type' = 'perfect_quiz' THEN (criteria->>'count')::INTEGER * 100
        WHEN criteria->>'type' = 'login_streak' THEN (criteria->>'days')::INTEGER * 100
        ELSE 100
    END
WHERE required_progress IS NULL OR required_progress = 0;

-- Set categories based on achievement type
UPDATE public.achievements
SET category = 
    CASE
        WHEN criteria->>'type' = 'course_completion' THEN 'courses'
        WHEN criteria->>'type' = 'lesson_completion' THEN 'lessons'
        WHEN criteria->>'type' = 'perfect_quiz' THEN 'quizzes'
        WHEN criteria->>'type' = 'login_streak' THEN 'engagement'
        ELSE 'general'
    END
WHERE category = 'general' OR category IS NULL;

-- Create a function to get achievement progress in a unified way
CREATE OR REPLACE FUNCTION public.get_achievement_progress(
    p_user_id UUID,
    p_achievement_id UUID
) RETURNS INTEGER AS $$
DECLARE
    achievement_rec RECORD;
    criteria_type TEXT;
    criteria_count INTEGER;
    user_count INTEGER;
    progress INTEGER := 0;
    table_exists BOOLEAN;
BEGIN
    -- Get achievement details
    SELECT * INTO achievement_rec
    FROM public.achievements
    WHERE id = p_achievement_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Extract criteria
    criteria_type := achievement_rec.criteria->>'type';
    
    -- Calculate progress based on type
    IF criteria_type = 'course_completion' THEN
        -- Check if user_courses table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_courses'
        ) INTO table_exists;
        
        IF table_exists THEN
            criteria_count := (achievement_rec.criteria->>'count')::INTEGER;
            
            SELECT COUNT(*) INTO user_count
            FROM public.user_courses
            WHERE user_id = p_user_id AND completed = TRUE;
            
            progress := LEAST(100, (user_count * 100 / criteria_count));
        END IF;
        
    ELSIF criteria_type = 'lesson_completion' THEN
        -- Check if user_lessons table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_lessons'
        ) INTO table_exists;
        
        IF table_exists THEN
            criteria_count := (achievement_rec.criteria->>'count')::INTEGER;
            
            SELECT COUNT(*) INTO user_count
            FROM public.user_lessons
            WHERE user_id = p_user_id AND completed = TRUE;
            
            progress := LEAST(100, (user_count * 100 / criteria_count));
        END IF;
        
    ELSIF criteria_type = 'perfect_quiz' THEN
        -- Check if user_quiz_results table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_quiz_results'
        ) INTO table_exists;
        
        IF table_exists THEN
            criteria_count := (achievement_rec.criteria->>'count')::INTEGER;
            
            SELECT COUNT(*) INTO user_count
            FROM public.user_quiz_results
            WHERE user_id = p_user_id AND score = 100 AND passed = TRUE;
            
            progress := LEAST(100, (user_count * 100 / criteria_count));
        END IF;
        
    ELSIF criteria_type = 'login_streak' THEN
        -- Check if user_login_streaks table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_login_streaks'
        ) INTO table_exists;
        
        IF table_exists THEN
            criteria_count := (achievement_rec.criteria->>'days')::INTEGER;
            
            SELECT 
                LEAST(100, (current_streak * 100 / criteria_count)) INTO progress
            FROM public.user_login_streaks
            WHERE user_id = p_user_id;
        END IF;
    END IF;
    
    RETURN progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a procedure to refresh all user achievements
CREATE OR REPLACE PROCEDURE public.refresh_all_user_achievements()
LANGUAGE plpgsql
AS $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN SELECT id FROM auth.users
    LOOP
        PERFORM public.check_user_achievements(user_rec.id);
        COMMIT;
    END LOOP;
END;
$$;

-- Create a procedure to refresh a specific user's achievements
CREATE OR REPLACE PROCEDURE public.refresh_user_achievements(p_user_id UUID)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.check_user_achievements(p_user_id);
END;
$$; 