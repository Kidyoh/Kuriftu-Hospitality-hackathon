
import { supabase } from "@/integrations/supabase/client";

// Function to ensure storage buckets exist
export async function ensureStorageBuckets() {
  // Check if lesson_content bucket exists
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error checking storage buckets:', error);
    return;
  }
  
  const lessonContentBucketExists = buckets.some(bucket => bucket.name === 'lesson_content');
  
  if (!lessonContentBucketExists) {
    // Create lesson_content bucket
    const { error: createError } = await supabase.storage.createBucket('lesson_content', {
      public: true, // Make bucket public so videos can be accessed without authentication
      fileSizeLimit: 1024 * 1024 * 100, // 100MB file size limit
    });
    
    if (createError) {
      console.error('Error creating lesson_content bucket:', createError);
    } else {
      console.log('Created lesson_content bucket');
    }
  }
}

// Call this function when the app initializes
// This is handled by the StorageInit component
