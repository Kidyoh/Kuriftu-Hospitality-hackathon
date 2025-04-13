-- Script to fix missing quiz options
-- This will automatically add options for multiple_choice and true_false questions that don't have any

-- First, ensure the quiz_options table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quiz_options'
    ) THEN
        CREATE TABLE public.quiz_options (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question_id UUID NOT NULL,
            option_text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT false,
            sequence_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add RLS policies
        ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Admins can do anything" ON public.quiz_options
            FOR ALL TO authenticated
            USING (auth.jwt() ->> 'role' = 'admin')
            WITH CHECK (auth.jwt() ->> 'role' = 'admin');
            
        CREATE POLICY "Everyone can read options" ON public.quiz_options
            FOR SELECT TO authenticated
            USING (true);
            
        RAISE NOTICE 'Created quiz_options table with RLS policies';
    END IF;
END $$;

-- Create a function to get and log quiz options by question ID
CREATE OR REPLACE FUNCTION public.get_quiz_options_by_question_id(p_question_id UUID)
RETURNS TABLE (
    id UUID,
    question_id UUID,
    option_text TEXT,
    is_correct BOOLEAN,
    sequence_order INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    option_count INTEGER;
BEGIN
    -- Get the count of options
    SELECT COUNT(*) INTO option_count
    FROM public.quiz_options
    WHERE question_id = p_question_id;
    
    -- Log the count
    RAISE NOTICE 'Found % options for question ID %', option_count, p_question_id;
    
    -- Return the options
    RETURN QUERY 
    SELECT 
        o.id, 
        o.question_id, 
        o.option_text, 
        o.is_correct, 
        o.sequence_order,
        o.created_at,
        o.updated_at
    FROM 
        public.quiz_options o
    WHERE 
        o.question_id = p_question_id
    ORDER BY 
        o.sequence_order;
        
    -- Add warning if no options found
    IF option_count = 0 THEN
        RAISE WARNING 'No options found for question ID %', p_question_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add true/false options for all questions that need them
DO $$
DECLARE
    tf_count INTEGER;
    tf_fixed INTEGER := 0;
    r RECORD;
BEGIN
    -- Find all true/false questions without options
    FOR r IN 
        SELECT q.id, q.question_text 
        FROM public.quiz_questions q
        LEFT JOIN public.quiz_options o ON q.id = o.question_id
        WHERE q.question_type = 'true_false'
        GROUP BY q.id, q.question_text
        HAVING COUNT(o.id) = 0
    LOOP
        -- Add standard true/false options
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        VALUES 
            (r.id, 'True', true, 0),
            (r.id, 'False', false, 1);
        
        tf_fixed := tf_fixed + 1;
        RAISE NOTICE 'Added true/false options for question: %', r.question_text;
    END LOOP;
    
    -- Report results
    IF tf_fixed > 0 THEN
        RAISE NOTICE 'Fixed % true/false questions', tf_fixed;
    ELSE
        RAISE NOTICE 'No true/false questions needed fixing';
    END IF;
END $$;

-- Add multiple choice options for all questions that need them
DO $$
DECLARE
    mc_count INTEGER;
    mc_fixed INTEGER := 0;
    r RECORD;
BEGIN
    -- Find all multiple choice questions without options
    FOR r IN 
        SELECT q.id, q.question_text 
        FROM public.quiz_questions q
        LEFT JOIN public.quiz_options o ON q.id = o.question_id
        WHERE q.question_type = 'multiple_choice'
        GROUP BY q.id, q.question_text
        HAVING COUNT(o.id) = 0
    LOOP
        -- Add default multiple choice options
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        VALUES 
            (r.id, 'Option A', true, 0),
            (r.id, 'Option B', false, 1),
            (r.id, 'Option C', false, 2),
            (r.id, 'Option D', false, 3);
        
        mc_fixed := mc_fixed + 1;
        RAISE NOTICE 'Added multiple choice options for question: %', r.question_text;
    END LOOP;
    
    -- Report results
    IF mc_fixed > 0 THEN
        RAISE NOTICE 'Fixed % multiple choice questions', mc_fixed;
    ELSE
        RAISE NOTICE 'No multiple choice questions needed fixing';
    END IF;
END $$;

-- Verify results
SELECT 
    q.question_type, 
    COUNT(DISTINCT q.id) AS total_questions,
    COUNT(DISTINCT CASE WHEN o.id IS NULL THEN q.id ELSE NULL END) AS questions_without_options
FROM 
    public.quiz_questions q
LEFT JOIN 
    public.quiz_options o ON q.id = o.question_id
WHERE 
    q.question_type IN ('multiple_choice', 'true_false')
GROUP BY 
    q.question_type; 