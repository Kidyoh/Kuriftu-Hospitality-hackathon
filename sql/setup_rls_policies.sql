-- Setup Row Level Security policies for all incentives tables

-- Drop and recreate policies using DO blocks to avoid errors
DO $$
BEGIN
    -- Drop existing policies for achievements table
    DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
    DROP POLICY IF EXISTS "All users can view achievements" ON public.achievements;
    
    -- Drop existing policies for rewards table
    DROP POLICY IF EXISTS "Admins can manage rewards" ON public.rewards;
    DROP POLICY IF EXISTS "All users can view rewards" ON public.rewards;
    
    -- Drop existing policies for user_rewards
    DROP POLICY IF EXISTS "Users can view their own rewards" ON public.user_rewards;
    DROP POLICY IF EXISTS "Admins can manage all user rewards" ON public.user_rewards;
    
    -- Drop existing policies for user_achievements
    DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
    DROP POLICY IF EXISTS "Admins can manage all user achievements" ON public.user_achievements;
    
    -- Drop existing policies for user_points
    DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
    DROP POLICY IF EXISTS "Admins can manage all user points" ON public.user_points;
    
    -- Drop existing policies for point_transactions
    DROP POLICY IF EXISTS "Users can view their own transactions" ON public.point_transactions;
    DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.point_transactions;
    
    -- Drop existing policies for user_login_streaks
    DROP POLICY IF EXISTS "Users can view their own login streaks" ON public.user_login_streaks;
    DROP POLICY IF EXISTS "Users can update their own login streaks" ON public.user_login_streaks;
    DROP POLICY IF EXISTS "Admins can manage all login streaks" ON public.user_login_streaks;
    
    -- Drop existing policies for user_quiz_results
    DROP POLICY IF EXISTS "Users can view their own quiz results" ON public.user_quiz_results;
    DROP POLICY IF EXISTS "Users can insert their own quiz results" ON public.user_quiz_results;
    DROP POLICY IF EXISTS "Users can update their own quiz results" ON public.user_quiz_results;
    DROP POLICY IF EXISTS "Admins can manage all quiz results" ON public.user_quiz_results;
    
    -- Drop existing policies for user_courses
    DROP POLICY IF EXISTS "Users can view their own courses" ON public.user_courses;
    DROP POLICY IF EXISTS "Users can insert their own course progress" ON public.user_courses;
    DROP POLICY IF EXISTS "Users can update their own courses" ON public.user_courses;
    DROP POLICY IF EXISTS "Admins can manage all user courses" ON public.user_courses;
    
    -- Drop existing policies for user_lessons
    DROP POLICY IF EXISTS "Users can view their own lessons" ON public.user_lessons;
    DROP POLICY IF EXISTS "Users can insert their own lesson progress" ON public.user_lessons;
    DROP POLICY IF EXISTS "Users can update their own lessons" ON public.user_lessons;
    DROP POLICY IF EXISTS "Admins can manage all user lessons" ON public.user_lessons;

    -- Drop existing policies for quiz_options
    DROP POLICY IF EXISTS "Admins can manage quiz options" ON public.quiz_options;
    DROP POLICY IF EXISTS "All users can view quiz options" ON public.quiz_options;
    DROP POLICY IF EXISTS "Quiz authors can manage their quiz options" ON public.quiz_options;
END
$$;

-- Create RLS policies for achievements table
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

-- Create RLS policies for rewards table
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

-- Create RLS policies for user_rewards
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

-- Create RLS policies for user_achievements
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

-- Create RLS policies for user_points
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

-- Create RLS policies for point_transactions
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

-- Create RLS policies for user_login_streaks
CREATE POLICY "Users can view their own login streaks" ON public.user_login_streaks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own login streaks" ON public.user_login_streaks
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all login streaks" ON public.user_login_streaks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

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

-- Add policy for admin to insert course progress on behalf of users
CREATE POLICY "Admins can insert course progress for users" ON public.user_courses
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

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

-- Add policy for admin to insert lesson progress on behalf of users
CREATE POLICY "Admins can insert lesson progress for users" ON public.user_lessons
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all user lessons" ON public.user_lessons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Disable RLS on quiz_options table
ALTER TABLE public.quiz_options DISABLE ROW LEVEL SECURITY;

-- Create policies for quiz_options
CREATE POLICY "Admins can manage quiz options" ON public.quiz_options
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "All users can view quiz options" ON public.quiz_options
    FOR SELECT TO authenticated
    USING (true);

-- Create policy for quiz authors to manage their own quiz options
CREATE POLICY "Quiz authors can manage their quiz options" ON public.quiz_options
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.quiz_questions
            JOIN public.quizzes ON quiz_questions.quiz_id = quizzes.id
            WHERE quiz_questions.id = quiz_options.question_id
            AND quizzes.author_id = auth.uid()
        )
    ); 