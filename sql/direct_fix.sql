-- Direct Fix Script for Quiz Options
-- This script directly inserts options for the known problematic questions

-- First question (c5762c9c-96d3-410b-b2e3-d2c99c3459dc)
INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
SELECT 
    'c5762c9c-96d3-410b-b2e3-d2c99c3459dc'::uuid, 
    'First', 
    FALSE, 
    0
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_options 
    WHERE question_id = 'c5762c9c-96d3-410b-b2e3-d2c99c3459dc'::uuid
);

INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
SELECT 
    'c5762c9c-96d3-410b-b2e3-d2c99c3459dc'::uuid, 
    'Second', 
    TRUE, 
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_options 
    WHERE question_id = 'c5762c9c-96d3-410b-b2e3-d2c99c3459dc'::uuid
);

INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
SELECT 
    'c5762c9c-96d3-410b-b2e3-d2c99c3459dc'::uuid, 
    'Third', 
    FALSE, 
    2
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_options 
    WHERE question_id = 'c5762c9c-96d3-410b-b2e3-d2c99c3459dc'::uuid
);

-- Second question (a57ee966-0446-4b5e-a85d-871d9130a985)
INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
SELECT 
    'a57ee966-0446-4b5e-a85d-871d9130a985'::uuid, 
    'Amazing', 
    TRUE, 
    0
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_options 
    WHERE question_id = 'a57ee966-0446-4b5e-a85d-871d9130a985'::uuid
);

INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
SELECT 
    'a57ee966-0446-4b5e-a85d-871d9130a985'::uuid, 
    'Amazing', 
    FALSE, 
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_options 
    WHERE question_id = 'a57ee966-0446-4b5e-a85d-871d9130a985'::uuid
);

INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
SELECT 
    'a57ee966-0446-4b5e-a85d-871d9130a985'::uuid, 
    'Not Amazing', 
    FALSE, 
    2
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_options 
    WHERE question_id = 'a57ee966-0446-4b5e-a85d-871d9130a985'::uuid
); 