-- Incentives Migration SQL
-- This file creates the necessary tables and functions for the incentives system

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rewards table for storing different types of rewards/badges
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('badge', 'certificate', 'points', 'resource')),
    icon_url TEXT,
    value INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_rewards table to track rewards earned by users
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, reward_id)
);

-- Create achievements table for defining milestones
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    criteria JSONB NOT NULL,
    points INTEGER DEFAULT 0,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table to track user progress towards achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Create user_points table to track overall point balance
CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total_points INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create point_transactions table to log all point transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_login_streaks table to track user login streaks for achievements
CREATE TABLE IF NOT EXISTS public.user_login_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NOT NULL,
    current_streak INTEGER DEFAULT 1,
    longest_streak INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Rewards policies
CREATE POLICY "Admins can manage rewards" ON public.rewards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "All users can view rewards" ON public.rewards
    FOR SELECT TO authenticated
    USING (true);

-- User rewards policies
CREATE POLICY "Users can view their own rewards" ON public.user_rewards
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user rewards" ON public.user_rewards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Achievements policies
CREATE POLICY "Admins can manage achievements" ON public.achievements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "All users can view achievements" ON public.achievements
    FOR SELECT TO authenticated
    USING (true);

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user achievements" ON public.user_achievements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- User points policies
CREATE POLICY "Users can view their own points" ON public.user_points
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user points" ON public.user_points
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Point transactions policies
CREATE POLICY "Users can view their own transactions" ON public.point_transactions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" ON public.point_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Login streak policies
CREATE POLICY "Users can view their own login streaks" ON public.user_login_streaks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login streaks" ON public.user_login_streaks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create trigger function to update user points on transaction
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update the user_points record
    INSERT INTO public.user_points (user_id, total_points, last_updated)
    VALUES (NEW.user_id, NEW.amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_points = public.user_points.total_points + NEW.amount,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on point_transactions
DROP TRIGGER IF EXISTS update_user_points_trigger ON public.point_transactions;
CREATE TRIGGER update_user_points_trigger
AFTER INSERT ON public.point_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_points();

-- Insert some sample achievement types
INSERT INTO public.achievements (name, description, criteria, points, icon_url)
VALUES 
    ('Course Completer', 'Complete your first course', '{"type": "course_completion", "count": 1}', 100, 'award'),
    ('Learning Streak', 'Access the platform for 7 consecutive days', '{"type": "login_streak", "days": 7}', 50, 'flame'),
    ('Quiz Master', 'Score 100% on 5 different quizzes', '{"type": "perfect_quiz", "count": 5}', 200, 'brain'),
    ('Lesson Explorer', 'Complete 20 lessons across any courses', '{"type": "lesson_completion", "count": 20}', 100, 'map'),
    ('Dedicated Learner', 'Access the platform for 30 consecutive days', '{"type": "login_streak", "days": 30}', 300, 'fire'),
    ('Learning Enthusiast', 'Complete 5 courses', '{"type": "course_completion", "count": 5}', 500, 'rocket'),
    ('Knowledge Seeker', 'Complete 50 lessons across any courses', '{"type": "lesson_completion", "count": 50}', 250, 'book');

-- Insert sample reward types
INSERT INTO public.rewards (name, description, type, value, icon_url)
VALUES 
    ('Learning Champion Badge', 'Awarded to dedicated learners', 'badge', 0, 'medal'),
    ('Certificate of Excellence', 'Recognition of outstanding achievement', 'certificate', 0, 'certificate'),
    ('Bonus Learning Resources', 'Access to premium resources', 'resource', 0, 'book'),
    ('Learning Credits', 'Points that can be redeemed for benefits', 'points', 500, 'coins');

-- Create function to update user login streaks
CREATE OR REPLACE FUNCTION public.update_user_login_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_login_timestamp TIMESTAMP WITH TIME ZONE;
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
    days_difference INTEGER;
    current_streak INTEGER;
    longest_streak INTEGER;
BEGIN
    -- Get the existing streak info if available
    SELECT 
        last_login, 
        current_streak, 
        longest_streak 
    INTO 
        last_login_timestamp, 
        current_streak, 
        longest_streak
    FROM public.user_login_streaks
    WHERE user_id = p_user_id;
    
    -- If no record exists, create a new one
    IF last_login_timestamp IS NULL THEN
        INSERT INTO public.user_login_streaks (
            user_id, 
            last_login, 
            current_streak, 
            longest_streak, 
            updated_at
        )
        VALUES (
            p_user_id, 
            current_timestamp, 
            1, 
            1, 
            current_timestamp
        );
        
        -- Exit early as this is the first login
        RETURN;
    END IF;
    
    -- Calculate the difference in days between now and the last login
    days_difference := EXTRACT(DAY FROM (current_timestamp - last_login_timestamp));
    
    -- If the user logged in on the same day, do nothing
    IF days_difference = 0 THEN
        RETURN;
    -- If the user logged in on the next day, increase the streak
    ELSIF days_difference = 1 THEN
        current_streak := current_streak + 1;
        
        -- Update longest streak if current streak is greater
        IF current_streak > longest_streak THEN
            longest_streak := current_streak;
        END IF;
    -- If the user missed days, reset the streak
    ELSE
        current_streak := 1;
    END IF;
    
    -- Update the user's login streak record
    UPDATE public.user_login_streaks
    SET 
        last_login = current_timestamp,
        current_streak = current_streak,
        longest_streak = longest_streak,
        updated_at = current_timestamp
    WHERE user_id = p_user_id;
    
    -- Check for login streak achievements
    PERFORM check_login_streak_achievements(p_user_id, current_streak);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check login streak achievements
CREATE OR REPLACE FUNCTION public.check_login_streak_achievements(p_user_id UUID, p_current_streak INTEGER)
RETURNS VOID AS $$
DECLARE
    achievement_rec RECORD;
    streak_days INTEGER;
BEGIN
    -- Loop through login streak achievements
    FOR achievement_rec IN 
        SELECT id, criteria, points 
        FROM public.achievements 
        WHERE criteria->>'type' = 'login_streak'
    LOOP
        -- Get required streak days from criteria
        streak_days := (achievement_rec.criteria->>'days')::INTEGER;
        
        -- If user's current streak meets or exceeds the requirement
        IF p_current_streak >= streak_days THEN
            -- Check if already awarded
            IF NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = p_user_id AND achievement_id = achievement_rec.id AND completed = TRUE
            ) THEN
                -- Award the achievement
                INSERT INTO public.user_achievements (user_id, achievement_id, progress, completed, completed_at)
                VALUES (p_user_id, achievement_rec.id, 100, TRUE, NOW())
                ON CONFLICT (user_id, achievement_id)
                DO UPDATE SET
                    progress = 100,
                    completed = TRUE,
                    completed_at = NOW();
                
                -- Award points
                INSERT INTO public.point_transactions (user_id, amount, description, reference_type, reference_id)
                VALUES (p_user_id, achievement_rec.points, 'Achievement completed: Login streak of ' || streak_days || ' days', 'achievement', achievement_rec.id);
            END IF;
        ELSE
            -- Update progress if not completed
            INSERT INTO public.user_achievements (user_id, achievement_id, progress, completed)
            VALUES (p_user_id, achievement_rec.id, LEAST(100, (p_current_streak * 100 / streak_days)), FALSE)
            ON CONFLICT (user_id, achievement_id)
            DO UPDATE SET
                progress = LEAST(100, (p_current_streak * 100 / streak_days)),
                updated_at = NOW();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    achievement_rec RECORD;
    criteria_json JSONB;
    criteria_type TEXT;
    criteria_count INTEGER;
    user_count INTEGER;
    should_award BOOLEAN;
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
            criteria_count := (criteria_json->>'count')::INTEGER;
            
            SELECT COUNT(*) INTO user_count
            FROM public.user_courses
            WHERE user_id = p_user_id AND completed = TRUE;
            
            IF user_count >= criteria_count THEN
                should_award := TRUE;
            END IF;
            
        ELSIF criteria_type = 'lesson_completion' THEN
            criteria_count := (criteria_json->>'count')::INTEGER;
            
            SELECT COUNT(*) INTO user_count
            FROM public.user_lessons
            WHERE user_id = p_user_id AND completed = TRUE;
            
            IF user_count >= criteria_count THEN
                should_award := TRUE;
            END IF;
            
        ELSIF criteria_type = 'perfect_quiz' THEN
            criteria_count := (criteria_json->>'count')::INTEGER;
            
            SELECT COUNT(*) INTO user_count
            FROM public.user_quiz_results
            WHERE user_id = p_user_id AND score = 100 AND passed = TRUE;
            
            IF user_count >= criteria_count THEN
                should_award := TRUE;
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
            -- Update progress if not completed
            IF criteria_type = 'course_completion' THEN
                criteria_count := (criteria_json->>'count')::INTEGER;
                
                SELECT COUNT(*) INTO user_count
                FROM public.user_courses
                WHERE user_id = p_user_id AND completed = TRUE;
                
                -- Calculate progress percentage
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

-- Create hooks for various user activities
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

-- Create trigger for lesson completion
DROP TRIGGER IF EXISTS lesson_completion_trigger ON public.user_lessons;
CREATE TRIGGER lesson_completion_trigger
AFTER UPDATE OR INSERT ON public.user_lessons
FOR EACH ROW
WHEN (NEW.completed = TRUE)
EXECUTE FUNCTION public.on_lesson_completion();

-- Create hook for course completion
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

-- Create trigger for course completion
DROP TRIGGER IF EXISTS course_completion_trigger ON public.user_courses;
CREATE TRIGGER course_completion_trigger
AFTER UPDATE OR INSERT ON public.user_courses
FOR EACH ROW
WHEN (NEW.completed = TRUE)
EXECUTE FUNCTION public.on_course_completion();

-- Create hook for quiz completion
CREATE OR REPLACE FUNCTION public.on_quiz_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a quiz result is recorded
    PERFORM public.check_user_achievements(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quiz completion
DROP TRIGGER IF EXISTS quiz_completion_trigger ON public.user_quiz_results;
CREATE TRIGGER quiz_completion_trigger
AFTER INSERT OR UPDATE ON public.user_quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.on_quiz_completion();

-- Create function to get user achievements summary
CREATE OR REPLACE FUNCTION public.get_user_achievement_summary(user_id UUID)
RETURNS TABLE (
    total INTEGER,
    completed INTEGER,
    in_progress INTEGER,
    completion_percentage INTEGER,
    total_points_earned INTEGER
) AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
    in_progress_count INTEGER;
    points_earned INTEGER;
BEGIN
    -- Get the total number of achievements
    SELECT COUNT(*) INTO total_count FROM public.achievements;
    
    -- Get completed achievements count
    SELECT COUNT(*) INTO completed_count
    FROM public.user_achievements
    WHERE user_achievements.user_id = $1 AND completed = TRUE;
    
    -- Get in-progress (not completed) achievements count
    SELECT COUNT(*) INTO in_progress_count
    FROM public.user_achievements
    WHERE user_achievements.user_id = $1 AND completed = FALSE;
    
    -- Calculate total points earned from achievements
    SELECT COALESCE(SUM(pt.amount), 0) INTO points_earned
    FROM public.point_transactions pt
    WHERE pt.user_id = $1 AND pt.reference_type = 'achievement';
    
    -- Return the results
    RETURN QUERY SELECT
        total_count,
        completed_count,
        in_progress_count,
        CASE WHEN total_count > 0 THEN
            (completed_count * 100) / total_count
        ELSE 0 END,
        points_earned;
END;
$$ LANGUAGE plpgsql; 