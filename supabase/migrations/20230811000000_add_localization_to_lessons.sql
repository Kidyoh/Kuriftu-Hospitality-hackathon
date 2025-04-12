-- Create execute_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION execute_sql(query text) RETURNS JSONB
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    EXECUTE query;
    RETURN jsonb_build_object('status', 'success');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- Add content columns for different languages to course_lessons table

-- First, check if columns already exist
DO $$
BEGIN
    -- Check if content_en column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'course_lessons' AND column_name = 'content_en'
    ) THEN
        -- Add content_en column
        ALTER TABLE course_lessons ADD COLUMN content_en TEXT;
    END IF;

    -- Check if content_am column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'course_lessons' AND column_name = 'content_am'
    ) THEN
        -- Add content_am column
        ALTER TABLE course_lessons ADD COLUMN content_am TEXT;
    END IF;

    -- Check if content_or column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'course_lessons' AND column_name = 'content_or'
    ) THEN
        -- Add content_or column
        ALTER TABLE course_lessons ADD COLUMN content_or TEXT;
    END IF;
END
$$;

-- Add comment to describe the columns
COMMENT ON COLUMN course_lessons.content_en IS 'Lesson content in English';
COMMENT ON COLUMN course_lessons.content_am IS 'Lesson content in Amharic';
COMMENT ON COLUMN course_lessons.content_or IS 'Lesson content in Oromiffa';

-- Update Supabase RLS policies to ensure proper access
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- Policy for admins (can do anything)
CREATE POLICY "Admins can do anything with lessons" ON course_lessons
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Policy for staff to view lessons
CREATE POLICY "Staff can view lessons" ON course_lessons
    FOR SELECT
    TO authenticated
    USING (true);

-- Update table indices for better performance
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id); 