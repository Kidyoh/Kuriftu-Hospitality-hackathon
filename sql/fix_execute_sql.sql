-- Fix execute_sql function error
-- First drop the existing function
DROP FUNCTION IF EXISTS execute_sql(text);

-- Then recreate it with the correct return type
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