-- Login Streak Migration
-- This script sets up login streak tracking

-- Check if user_login_streaks table exists and create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_login_streaks'
    ) THEN
        CREATE TABLE public.user_login_streaks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            last_login TIMESTAMP WITH TIME ZONE NOT NULL,
            current_streak INTEGER DEFAULT 1,
            longest_streak INTEGER DEFAULT 1,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        -- Enable RLS
        ALTER TABLE public.user_login_streaks ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create function to update user login streaks
CREATE OR REPLACE FUNCTION public.update_user_login_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_login_timestamp TIMESTAMP WITH TIME ZONE;
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
    days_difference INTEGER;
    user_current_streak INTEGER;
    user_longest_streak INTEGER;
BEGIN
    -- Get the existing streak info if available
    SELECT 
        last_login, 
        current_streak, 
        longest_streak 
    INTO 
        last_login_timestamp, 
        user_current_streak, 
        user_longest_streak
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
        user_current_streak := user_current_streak + 1;
        
        -- Update longest streak if current streak is greater
        IF user_current_streak > user_longest_streak THEN
            user_longest_streak := user_current_streak;
        END IF;
    -- If the user missed days, reset the streak
    ELSE
        user_current_streak := 1;
    END IF;
    
    -- Update the user's login streak record with fully qualified column names
    UPDATE public.user_login_streaks
    SET 
        last_login = current_timestamp,
        current_streak = user_current_streak,
        longest_streak = user_longest_streak,
        updated_at = current_timestamp
    WHERE user_id = p_user_id;
    
    -- Check for login streak achievements
    PERFORM check_login_streak_achievements(p_user_id, user_current_streak);
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

-- Create a function to get user's login streak
CREATE OR REPLACE FUNCTION public.get_user_login_streak(p_user_id UUID)
RETURNS TABLE (
    current_streak INTEGER,
    longest_streak INTEGER,
    last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uls.current_streak,
        uls.longest_streak,
        uls.last_login
    FROM 
        public.user_login_streaks uls
    WHERE 
        uls.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to update login streak on authentication
CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's login streak
    PERFORM public.update_user_login_streak(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up trigger on auth.users for login tracking
-- This may need special privileges to implement depending on your Supabase setup
-- As an alternative, you can call update_user_login_streak directly from your application code
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_user_login ON auth.users;
    
    -- Depending on your Supabase permissions, this may or may not work directly
    -- If it doesn't work, you'll need to call the update_user_login_streak function from your application
    BEGIN
        CREATE TRIGGER on_user_login
        AFTER UPDATE OF last_sign_in_at ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.on_auth_user_login();
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Could not create trigger on auth.users due to insufficient privileges. You will need to call update_user_login_streak from your application code on user login.';
    END;
END
$$;

-- Create RLS policies for the new table
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

CREATE POLICY "System can update login streaks" ON public.user_login_streaks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR auth.uid() = user_id)
        )
    );

-- Insert login streak achievements if they don't exist
INSERT INTO public.achievements (name, description, criteria, points, icon_url)
SELECT 
    'Learning Streak', 
    'Access the platform for 7 consecutive days', 
    '{"type": "login_streak", "days": 7}', 
    50, 
    'flame'
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'login_streak' AND (criteria->>'days')::INTEGER = 7
);

INSERT INTO public.achievements (name, description, criteria, points, icon_url)
SELECT 
    'Dedicated Learner', 
    'Access the platform for 30 consecutive days', 
    '{"type": "login_streak", "days": 30}', 
    300, 
    'fire'
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'login_streak' AND (criteria->>'days')::INTEGER = 30
);

-- Create function to get user achievements summary if it doesn't exist
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