-- Migration Helper Script
-- To fix the errors in CourseDetail.tsx related to missing tables and columns

-- HOW TO USE:
-- 1. Open Supabase SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute all commands

-- Check if uuid-ossp extension is installed (needed for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing functions first (in case they exist with different return types)
DROP FUNCTION IF EXISTS public.check_column_exists(text, text);
DROP FUNCTION IF EXISTS public.execute_sql(text);
DROP FUNCTION IF EXISTS public.create_user_courses_table();
DROP FUNCTION IF EXISTS public.create_user_lessons_table();
DROP FUNCTION IF EXISTS public.add_last_accessed_column();

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.check_column_exists(p_table_name text, p_column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  );
END;
$$;

-- Function to execute arbitrary SQL (use with caution)
CREATE OR REPLACE FUNCTION public.execute_sql(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE p_sql;
END;
$$;

-- Function to create user_courses table
CREATE OR REPLACE FUNCTION public.create_user_courses_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    progress INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
  );
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user_courses table: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to create user_lessons table
CREATE OR REPLACE FUNCTION public.create_user_lessons_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.user_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    progress INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, lesson_id)
  );
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user_lessons table: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to add last_accessed column to user_courses table
CREATE OR REPLACE FUNCTION public.add_last_accessed_column()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_courses'
      AND column_name = 'last_accessed'
  ) THEN
    ALTER TABLE public.user_courses 
    ADD COLUMN last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding last_accessed column: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Directly create the tables in case they don't exist

-- Create user_courses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_courses'
  ) THEN
    CREATE TABLE public.user_courses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
      progress INT DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    );
    RAISE NOTICE 'Created user_courses table';
  ELSE
    RAISE NOTICE 'user_courses table already exists';
    
    -- Check if last_accessed column exists in user_courses table
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_courses'
        AND column_name = 'last_accessed'
    ) THEN
      ALTER TABLE public.user_courses 
      ADD COLUMN last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE 'Added last_accessed column to user_courses table';
    ELSE
      RAISE NOTICE 'last_accessed column already exists in user_courses table';
    END IF;
  END IF;
END $$;

-- Create user_lessons table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_lessons'
  ) THEN
    CREATE TABLE public.user_lessons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
      course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
      progress INT DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(user_id, lesson_id)
    );
    RAISE NOTICE 'Created user_lessons table';
  ELSE
    RAISE NOTICE 'user_lessons table already exists';
  END IF;
END $$;

-- Display confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed. Required tables and functions have been created.';
END $$; 