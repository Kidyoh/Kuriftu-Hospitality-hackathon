-- Fix Quiz Options Relationship SQL
-- This script fixes the relationship between quiz_questions and quiz_options
-- by ensuring IDs match and creating missing options if needed

-- First check if both tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_questions') AND
       EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_options') THEN
    
        -- Create a temporary table to store question IDs that need options
        CREATE TEMP TABLE questions_needing_options AS
        SELECT q.id AS question_id, q.question_text, q.question_type, q.quiz_id
        FROM public.quiz_questions q
        LEFT JOIN public.quiz_options o ON o.question_id = q.id
        WHERE q.question_type IN ('multiple_choice', 'true_false')
        GROUP BY q.id, q.question_text, q.question_type, q.quiz_id
        HAVING COUNT(o.id) = 0;

        -- Log which questions need options
        RAISE NOTICE 'Found % questions with no options', (SELECT COUNT(*) FROM questions_needing_options);
        
        -- For true/false questions with no options, create default options
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        SELECT 
            question_id,
            'True',
            TRUE,
            0
        FROM questions_needing_options
        WHERE question_type = 'true_false';
        
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        SELECT 
            question_id,
            'False',
            FALSE,
            1
        FROM questions_needing_options
        WHERE question_type = 'true_false';
        
        -- For multiple choice questions without options, create placeholder options
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        SELECT 
            question_id,
            'Option 1 (Generated)',
            TRUE,
            0
        FROM questions_needing_options
        WHERE question_type = 'multiple_choice';
        
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        SELECT 
            question_id,
            'Option 2 (Generated)',
            FALSE,
            1
        FROM questions_needing_options
        WHERE question_type = 'multiple_choice';
        
        INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
        SELECT 
            question_id,
            'Option 3 (Generated)',
            FALSE,
            2
        FROM questions_needing_options
        WHERE question_type = 'multiple_choice';
        
        -- Check for inconsistency in IDs (UUID format or string format)
        CREATE TEMP TABLE question_id_formats AS
        SELECT 
            id,
            LENGTH(id::text) AS id_length,
            CASE 
                WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'uuid_format'
                ELSE 'other_format'
            END AS id_format
        FROM public.quiz_questions;
        
        -- If inconsistent formats are found, standardize them
        IF EXISTS (SELECT FROM question_id_formats WHERE id_format <> 'uuid_format') THEN
            RAISE NOTICE 'Found inconsistent ID formats in quiz_questions table';
            
            -- Update options to match questions
            UPDATE public.quiz_options o
            SET question_id = q.id
            FROM public.quiz_questions q
            WHERE q.id::text <> o.question_id::text
            AND (q.id::text = REPLACE(o.question_id::text, ' ', '') 
                 OR REPLACE(q.id::text, '-', '') = REPLACE(o.question_id::text, '-', ''));
        END IF;
        
        -- Log completion
        RAISE NOTICE 'Quiz options fix completed.';
        
        -- Output helpful debugging info
        RAISE NOTICE 'Quiz questions count: %', (SELECT COUNT(*) FROM public.quiz_questions);
        RAISE NOTICE 'Quiz options count: %', (SELECT COUNT(*) FROM public.quiz_options);
        
    ELSE
        RAISE NOTICE 'Required tables (quiz_questions and/or quiz_options) do not exist!';
    END IF;
END$$;

-- Create a view that properly joins questions and options for debugging
CREATE OR REPLACE VIEW vw_quiz_questions_with_options AS
SELECT 
    q.id AS question_id,
    q.question_text,
    q.question_type,
    q.quiz_id,
    COUNT(o.id) AS option_count,
    ARRAY_AGG(o.option_text ORDER BY o.sequence_order) AS options
FROM public.quiz_questions q
LEFT JOIN public.quiz_options o ON o.question_id = q.id
GROUP BY q.id, q.question_text, q.question_type, q.quiz_id;

-- Create a function to easily get options for a question
DROP FUNCTION IF EXISTS get_question_options(UUID);

CREATE OR REPLACE FUNCTION get_question_options(p_question_id UUID)
RETURNS TABLE (
    id UUID,
    option_text TEXT,
    is_correct BOOLEAN,
    sequence_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.option_text,
        o.is_correct,
        o.sequence_order
    FROM public.quiz_options o
    WHERE o.question_id = p_question_id
    ORDER BY o.sequence_order;
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure all questions have options
CREATE OR REPLACE FUNCTION ensure_question_has_options()
RETURNS TRIGGER AS $$
BEGIN
    -- For new multiple_choice or true_false questions, ensure they have options
    IF NEW.question_type = 'true_false' THEN
        -- Check if options already exist
        IF NOT EXISTS (SELECT 1 FROM public.quiz_options WHERE question_id = NEW.id) THEN
            -- Create default true/false options
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES (NEW.id, 'True', TRUE, 0);
            
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES (NEW.id, 'False', FALSE, 1);
        END IF;
    ELSIF NEW.question_type = 'multiple_choice' THEN
        -- Check if options already exist
        IF NOT EXISTS (SELECT 1 FROM public.quiz_options WHERE question_id = NEW.id) THEN
            -- Create default options for multiple choice
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES 
                (NEW.id, 'Option 1', TRUE, 0),
                (NEW.id, 'Option 2', FALSE, 1),
                (NEW.id, 'Option 3', FALSE, 2);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure new questions get default options
DROP TRIGGER IF EXISTS ensure_question_options_trigger ON public.quiz_questions;
CREATE TRIGGER ensure_question_options_trigger
AFTER INSERT ON public.quiz_questions
FOR EACH ROW
WHEN (NEW.question_type IN ('multiple_choice', 'true_false'))
EXECUTE FUNCTION ensure_question_has_options();

-- Create a view to directly access question options easily
CREATE OR REPLACE VIEW vw_question_options AS
SELECT 
    o.id AS option_id,
    o.question_id,
    o.option_text,
    o.is_correct,
    o.sequence_order,
    q.quiz_id
FROM 
    quiz_options o
JOIN 
    quiz_questions q ON o.question_id = q.id;

-- Create an emergency function for executing SQL directly from frontend (admin only)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    -- Only admins can execute this
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Permission denied: only admins can execute direct SQL';
    END IF;
    
    -- Execute the query and return results as JSON, handling empty results
    BEGIN
        EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::jsonb) FROM (' || sql_query || ') t' INTO result;
        -- If result is null, return empty array
        IF result IS NULL THEN
            result := '[]'::jsonb;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but return empty result set
        RAISE WARNING 'SQL execution error: %', SQLERRM;
        result := '[]'::jsonb;
    END;
    
    RETURN result;
END;
$$;

-- Create a helper function to check if a table or view exists
CREATE OR REPLACE FUNCTION has_table_or_view(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = table_name
    UNION
    SELECT FROM pg_catalog.pg_views WHERE schemaname = 'public' AND viewname = table_name
  );
END;
$$;

-- Direct fix for known problematic questions
DO $$
DECLARE
    question_id1 UUID := 'c5762c9c-96d3-410b-b2e3-d2c99c3459dc';
    question_id2 UUID := 'a57ee966-0446-4b5e-a85d-871d9130a985';
    question_type text;
BEGIN
    -- Process first problematic ID
    -- Check if options already exist
    IF NOT EXISTS (SELECT 1 FROM public.quiz_options WHERE question_id = question_id1) THEN
        -- Get question type
        SELECT question_type INTO question_type FROM public.quiz_questions WHERE id = question_id1;
        
        IF question_type = 'multiple_choice' THEN
            -- Insert options for multiple choice
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES
                (question_id1, 'First', FALSE, 0),
                (question_id1, 'Second', TRUE, 1),
                (question_id1, 'Third', FALSE, 2);
                
            RAISE NOTICE 'Created options for question %', question_id1;
        ELSIF question_type = 'true_false' THEN
            -- Insert options for true/false
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES
                (question_id1, 'True', TRUE, 0),
                (question_id1, 'False', FALSE, 1);
                
            RAISE NOTICE 'Created options for question %', question_id1;
        END IF;
    ELSE
        RAISE NOTICE 'Question % already has options', question_id1;
    END IF;
    
    -- Process second problematic ID
    -- Check if options already exist
    IF NOT EXISTS (SELECT 1 FROM public.quiz_options WHERE question_id = question_id2) THEN
        -- Get question type
        SELECT question_type INTO question_type FROM public.quiz_questions WHERE id = question_id2;
        
        IF question_type = 'multiple_choice' THEN
            -- Insert options for multiple choice
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES
                (question_id2, 'Amazing', TRUE, 0),
                (question_id2, 'Amazing', FALSE, 1),
                (question_id2, 'Not Amazing', FALSE, 2);
                
            RAISE NOTICE 'Created options for question %', question_id2;
        ELSIF question_type = 'true_false' THEN
            -- Insert options for true/false
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES
                (question_id2, 'True', TRUE, 0),
                (question_id2, 'False', FALSE, 1);
                
            RAISE NOTICE 'Created options for question %', question_id2;
        END IF;
    ELSE
        RAISE NOTICE 'Question % already has options', question_id2;
    END IF;
END $$; 