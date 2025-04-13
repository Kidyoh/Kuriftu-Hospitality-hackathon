-- Create a function to check if table/view exists
CREATE OR REPLACE FUNCTION public.has_table_or_view(table_name text)
RETURNS boolean
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
    );
$$;

-- Quiz Options View Creator
-- This script creates a view to identify questions missing options

-- Check if the view already exists and drop it if it does
DROP VIEW IF EXISTS vw_quiz_questions_with_options;

-- Create a view that joins questions and options for easy identification of problems
CREATE OR REPLACE VIEW vw_quiz_questions_with_options AS
SELECT 
    q.id AS question_id,
    q.question_text,
    q.question_type,
    q.quiz_id,
    COUNT(o.id) AS option_count,
    ARRAY_AGG(o.option_text ORDER BY o.sequence_order) 
        FILTER (WHERE o.option_text IS NOT NULL) AS options
FROM 
    public.quiz_questions q
LEFT JOIN 
    public.quiz_options o ON o.question_id = q.id
GROUP BY 
    q.id, q.question_text, q.question_type, q.quiz_id;

-- Create another view specifically for questions missing options
CREATE OR REPLACE VIEW vw_questions_missing_options AS
SELECT 
    question_id,
    question_text,
    question_type,
    quiz_id,
    option_count
FROM 
    vw_quiz_questions_with_options
WHERE 
    question_type IN ('multiple_choice', 'true_false')
    AND option_count = 0;

-- Output some statistics
DO $$
DECLARE
    total_questions INTEGER;
    missing_options INTEGER;
    tf_questions INTEGER;
    mc_questions INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_questions FROM public.quiz_questions;
    SELECT COUNT(*) INTO missing_options FROM vw_questions_missing_options;
    SELECT COUNT(*) INTO tf_questions FROM vw_questions_missing_options WHERE question_type = 'true_false';
    SELECT COUNT(*) INTO mc_questions FROM vw_questions_missing_options WHERE question_type = 'multiple_choice';
    
    -- Output results
    RAISE NOTICE 'Quiz question statistics:';
    RAISE NOTICE '- Total questions: %', total_questions;
    RAISE NOTICE '- Questions missing options: % (%.2f%%)', 
        missing_options, 
        CASE WHEN total_questions > 0 THEN 
            (missing_options::FLOAT / total_questions) * 100 
        ELSE 0 END;
    RAISE NOTICE '- True/False questions missing options: %', tf_questions;
    RAISE NOTICE '- Multiple Choice questions missing options: %', mc_questions;
END $$;

-- Grant permissions for the view
GRANT SELECT ON public.vw_quiz_questions_with_options TO authenticated;
GRANT SELECT ON public.vw_quiz_questions_with_options TO anon;

-- Test query to identify questions without options
SELECT * FROM public.vw_quiz_questions_with_options 
WHERE question_type IN ('multiple_choice', 'true_false') 
AND option_count = 0
LIMIT 10; 