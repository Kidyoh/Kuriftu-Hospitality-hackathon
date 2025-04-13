-- Direct Fix for specific question f8be9db7-7896-4a09-86b2-211081e0d8b8
-- First, check if the question exists and what type it is
DO $$
DECLARE
    question_id UUID := 'f8be9db7-7896-4a09-86b2-211081e0d8b8';
    question_type text;
    quiz_id text;
    option_count integer;
BEGIN
    -- Check if question exists
    SELECT q.question_type, q.quiz_id 
    INTO question_type, quiz_id 
    FROM public.quiz_questions q 
    WHERE q.id = question_id;
    
    IF question_type IS NULL THEN
        RAISE NOTICE 'Question with ID % does not exist!', question_id;
        RETURN;
    END IF;
    
    -- Check if options already exist
    SELECT COUNT(*) 
    INTO option_count 
    FROM public.quiz_options 
    WHERE question_id = question_id;
    
    RAISE NOTICE 'Question ID: %, Type: %, Quiz: %, Has % options', 
        question_id, question_type, quiz_id, option_count;
    
    -- If no options exist, create them based on question type
    IF option_count = 0 THEN
        IF question_type = 'multiple_choice' THEN
            -- Create options for multiple choice question
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES
                (question_id, 'Option 1', TRUE, 0),
                (question_id, 'Option 2', FALSE, 1),
                (question_id, 'Option 3', FALSE, 2);
                
            RAISE NOTICE 'Created 3 options for multiple choice question %', question_id;
        ELSIF question_type = 'true_false' THEN
            -- Create options for true/false question
            INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
            VALUES
                (question_id, 'True', TRUE, 0),
                (question_id, 'False', FALSE, 1);
                
            RAISE NOTICE 'Created 2 options for true/false question %', question_id;
        ELSE
            RAISE NOTICE 'Question % has type %, which does not require options', 
                question_id, question_type;
        END IF;
    ELSE
        RAISE NOTICE 'Question % already has % options, no action needed', 
            question_id, option_count;
    END IF;
END $$;

-- Show all options for the question after our fix
SELECT * FROM public.quiz_options WHERE question_id = 'f8be9db7-7896-4a09-86b2-211081e0d8b8';

-- Verify quiz_options table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz_options' 
ORDER BY ordinal_position; 