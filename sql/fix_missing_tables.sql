-- Fix missing tables migration script

-- Create user_quiz_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quiz_id UUID NOT NULL,
    score INTEGER NOT NULL,
    passed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Create user_lessons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID NOT NULL,
    course_id UUID NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security on the new tables
ALTER TABLE public.user_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lessons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the quiz results table
CREATE POLICY "Users can view their own quiz results" ON public.user_quiz_results
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results" ON public.user_quiz_results
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz results" ON public.user_quiz_results
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all quiz results" ON public.user_quiz_results
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create RLS policies for the user_courses table
CREATE POLICY "Users can view their own courses" ON public.user_courses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course progress" ON public.user_courses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" ON public.user_courses
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user courses" ON public.user_courses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create RLS policies for the user_lessons table
CREATE POLICY "Users can view their own lessons" ON public.user_lessons
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson progress" ON public.user_lessons
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lessons" ON public.user_lessons
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user lessons" ON public.user_lessons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Modify the check_user_achievements function to handle case when tables don't exist
CREATE OR REPLACE FUNCTION public.check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    achievement_rec RECORD;
    criteria_json JSONB;
    criteria_type TEXT;
    criteria_count INTEGER;
    user_count INTEGER;
    should_award BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Loop through all achievements
    FOR achievement_rec IN 
        SELECT id, criteria, points 
        FROM public.achievements 
    LOOP
        -- Parse criteria
        criteria_json := achievement_rec.criteria;
        criteria_type := criteria_json->>'type';
        
        should_award := FALSE;
        
        -- Check if user meets criteria based on type
        IF criteria_type = 'course_completion' THEN
            -- Check if user_courses table exists
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'user_courses'
            ) INTO table_exists;
            
            IF table_exists THEN
                criteria_count := (criteria_json->>'count')::INTEGER;
                
                SELECT COUNT(*) INTO user_count
                FROM public.user_courses
                WHERE user_id = p_user_id AND completed = TRUE;
                
                IF user_count >= criteria_count THEN
                    should_award := TRUE;
                END IF;
            END IF;
            
        ELSIF criteria_type = 'lesson_completion' THEN
            -- Check if user_lessons table exists
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'user_lessons'
            ) INTO table_exists;
            
            IF table_exists THEN
                criteria_count := (criteria_json->>'count')::INTEGER;
                
                SELECT COUNT(*) INTO user_count
                FROM public.user_lessons
                WHERE user_id = p_user_id AND completed = TRUE;
                
                IF user_count >= criteria_count THEN
                    should_award := TRUE;
                END IF;
            END IF;
            
        ELSIF criteria_type = 'quiz_completion' THEN
            -- Check if user_quiz_results table exists
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'user_quiz_results'
            ) INTO table_exists;
            
            IF table_exists THEN
                criteria_count := (criteria_json->>'count')::INTEGER;
                
                SELECT COUNT(*) INTO user_count
                FROM public.user_quiz_results
                WHERE user_id = p_user_id AND passed = TRUE;
                
                IF user_count >= criteria_count THEN
                    should_award := TRUE;
                END IF;
            END IF;
            
        ELSIF criteria_type = 'perfect_quiz' THEN
            -- Check if user_quiz_results table exists
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'user_quiz_results'
            ) INTO table_exists;
            
            IF table_exists THEN
                criteria_count := (criteria_json->>'count')::INTEGER;
                
                SELECT COUNT(*) INTO user_count
                FROM public.user_quiz_results
                WHERE user_id = p_user_id AND score = 100 AND passed = TRUE;
                
                IF user_count >= criteria_count THEN
                    should_award := TRUE;
                END IF;
            END IF;
        END IF;
        
        -- Award achievement if criteria met and not already awarded
        IF should_award THEN
            -- Check if already awarded
            IF NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = p_user_id AND achievement_id = achievement_rec.id AND completed = TRUE
            ) THEN
                -- Insert or update achievement
                INSERT INTO public.user_achievements (user_id, achievement_id, progress, completed, completed_at)
                VALUES (p_user_id, achievement_rec.id, 100, TRUE, NOW())
                ON CONFLICT (user_id, achievement_id)
                DO UPDATE SET
                    progress = 100,
                    completed = TRUE,
                    completed_at = NOW();
                
                -- Award points
                INSERT INTO public.point_transactions (user_id, amount, description, reference_type, reference_id)
                VALUES (p_user_id, achievement_rec.points, 'Achievement completed: ' || criteria_type, 'achievement', achievement_rec.id);
            END IF;
        ELSE
            -- Update progress for incomplete achievements
            IF table_exists THEN
                IF criteria_type = 'course_completion' THEN
                    criteria_count := (criteria_json->>'count')::INTEGER;
                    
                    SELECT COUNT(*) INTO user_count
                    FROM public.user_courses
                    WHERE user_id = p_user_id AND completed = TRUE;
                    
                ELSIF criteria_type = 'lesson_completion' THEN
                    criteria_count := (criteria_json->>'count')::INTEGER;
                    
                    SELECT COUNT(*) INTO user_count
                    FROM public.user_lessons
                    WHERE user_id = p_user_id AND completed = TRUE;
                    
                ELSIF criteria_type = 'quiz_completion' THEN
                    criteria_count := (criteria_json->>'count')::INTEGER;
                    
                    SELECT COUNT(*) INTO user_count
                    FROM public.user_quiz_results
                    WHERE user_id = p_user_id AND passed = TRUE;
                    
                ELSIF criteria_type = 'perfect_quiz' THEN
                    criteria_count := (criteria_json->>'count')::INTEGER;
                    
                    SELECT COUNT(*) INTO user_count
                    FROM public.user_quiz_results
                    WHERE user_id = p_user_id AND score = 100 AND passed = TRUE;
                END IF;
                
                -- Calculate and update progress
                INSERT INTO public.user_achievements (user_id, achievement_id, progress, completed)
                VALUES (p_user_id, achievement_rec.id, LEAST(100, (user_count * 100 / criteria_count)), FALSE)
                ON CONFLICT (user_id, achievement_id)
                DO UPDATE SET
                    progress = LEAST(100, (user_count * 100 / criteria_count)),
                    updated_at = NOW();
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the on_quiz_completion trigger function to check if the table exists
CREATE OR REPLACE FUNCTION public.on_quiz_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a quiz result is recorded
    PERFORM public.check_user_achievements(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the on_lesson_completion trigger function
CREATE OR REPLACE FUNCTION public.on_lesson_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- If lesson was marked as completed
    IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
        -- Call check achievements
        PERFORM public.check_user_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the on_course_completion trigger function
CREATE OR REPLACE FUNCTION public.on_course_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- If course was marked as completed
    IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
        -- Call check achievements
        PERFORM public.check_user_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create the triggers if the tables exist
DO $$
BEGIN
    -- Check if user_quiz_results table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_quiz_results'
    ) THEN
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS quiz_completion_trigger ON public.user_quiz_results;
        
        -- Create trigger for quiz completion
        CREATE TRIGGER quiz_completion_trigger
        AFTER INSERT OR UPDATE ON public.user_quiz_results
        FOR EACH ROW
        EXECUTE FUNCTION public.on_quiz_completion();
    END IF;
    
    -- Check if user_lessons table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_lessons'
    ) THEN
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS lesson_completion_trigger ON public.user_lessons;
        
        -- Create trigger for lesson completion
        CREATE TRIGGER lesson_completion_trigger
        AFTER UPDATE OR INSERT ON public.user_lessons
        FOR EACH ROW
        WHEN (NEW.completed = TRUE)
        EXECUTE FUNCTION public.on_lesson_completion();
    END IF;
    
    -- Check if user_courses table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_courses'
    ) THEN
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS course_completion_trigger ON public.user_courses;
        
        -- Create trigger for course completion
        CREATE TRIGGER course_completion_trigger
        AFTER UPDATE OR INSERT ON public.user_courses
        FOR EACH ROW
        WHEN (NEW.completed = TRUE)
        EXECUTE FUNCTION public.on_course_completion();
    END IF;
END
$$; 