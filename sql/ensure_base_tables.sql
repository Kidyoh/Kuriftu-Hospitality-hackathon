-- Ensure base tables for the incentives system exist

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create achievements table FIRST if it doesn't exist
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    criteria JSONB NOT NULL,
    points INTEGER DEFAULT 0,
    icon_url TEXT,
    title VARCHAR(255),
    icon VARCHAR(255),
    category VARCHAR(50) DEFAULT 'general',
    required_progress INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Enable Row Level Security on all tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lessons ENABLE ROW LEVEL SECURITY;

-- Insert sample achievement types if the table is empty
INSERT INTO public.achievements (name, description, criteria, points, icon_url, title, icon, category, required_progress)
SELECT 
    'Course Completer', 
    'Complete your first course', 
    '{"type": "course_completion", "count": 1}', 
    100, 
    'award', 
    'Course Completer',
    'award',
    'courses',
    100
WHERE NOT EXISTS (SELECT 1 FROM public.achievements);

-- Insert remaining sample achievement types if not already present
INSERT INTO public.achievements (name, description, criteria, points, icon_url, title, icon, category, required_progress)
SELECT 
    'Learning Streak', 
    'Access the platform for 7 consecutive days', 
    '{"type": "login_streak", "days": 7}', 
    50, 
    'flame', 
    'Learning Streak',
    'flame',
    'engagement',
    700
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'login_streak' AND (criteria->>'days')::INTEGER = 7
);

INSERT INTO public.achievements (name, description, criteria, points, icon_url, title, icon, category, required_progress)
SELECT 
    'Quiz Master', 
    'Score 100% on 5 different quizzes', 
    '{"type": "perfect_quiz", "count": 5}', 
    200, 
    'brain', 
    'Quiz Master',
    'brain',
    'quizzes',
    500
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'perfect_quiz' AND (criteria->>'count')::INTEGER = 5
);

INSERT INTO public.achievements (name, description, criteria, points, icon_url, title, icon, category, required_progress)
SELECT 
    'Lesson Explorer', 
    'Complete 20 lessons across any courses', 
    '{"type": "lesson_completion", "count": 20}', 
    100, 
    'map', 
    'Lesson Explorer',
    'map',
    'lessons',
    2000
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'lesson_completion' AND (criteria->>'count')::INTEGER = 20
);

INSERT INTO public.achievements (name, description, criteria, points, icon_url, title, icon, category, required_progress)
SELECT 
    'Quiz Champion', 
    'Complete 10 quizzes successfully', 
    '{"type": "quiz_completion", "count": 10}'::jsonb, 
    150, 
    'trophy', 
    'Quiz Champion',
    'trophy',
    'quizzes',
    1000
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'quiz_completion' AND (criteria->>'count')::INTEGER = 10
);

INSERT INTO public.achievements (name, description, criteria, points, icon_url, title, icon, category, required_progress)
SELECT 
    'Perfect Scorer', 
    'Get a perfect score on 3 different quizzes', 
    '{"type": "perfect_quiz", "count": 3}'::jsonb, 
    200, 
    'star', 
    'Perfect Scorer',
    'star',
    'quizzes',
    300
WHERE NOT EXISTS (
    SELECT 1 FROM public.achievements 
    WHERE criteria->>'type' = 'perfect_quiz' AND (criteria->>'count')::INTEGER = 3
);

-- Insert sample reward types if the table is empty
INSERT INTO public.rewards (name, description, type, value, icon_url)
SELECT 
    'Learning Champion Badge', 
    'Awarded to dedicated learners', 
    'badge', 
    0, 
    'medal'
WHERE NOT EXISTS (SELECT 1 FROM public.rewards); 