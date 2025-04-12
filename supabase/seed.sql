
-- Create a storage bucket for user avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');

-- Set up storage policies to allow users to upload their own avatars
BEGIN;
  -- Clean up policies if they exist
  DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Allow public read access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
    
  CREATE POLICY "Allow authenticated uploads"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');
    
  CREATE POLICY "Allow users to update their own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');
    
  CREATE POLICY "Allow users to delete their own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');
COMMIT;
