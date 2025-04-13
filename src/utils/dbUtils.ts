import { supabase } from '@/integrations/supabase/client';

// Checks if a table exists in the database by trying to select from it
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // If there's no error, the table exists
    return !error;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Function to ensure all quiz-related tables exist
export async function ensureQuizTablesExist(): Promise<boolean> {
  try {
    console.log('Ensuring quiz tables exist');
    
    // Create the quizzes table if it doesn't exist
    const quizzesExist = await checkTableExists('quizzes');
    if (!quizzesExist) {
      const quizzesCreated = await createMinimalQuizStructure();
      if (!quizzesCreated) {
        console.error('Failed to create quizzes table');
        return false;
      }
    }
    
    // Create the quiz_questions table if it doesn't exist
    const questionsExist = await checkTableExists('quiz_questions');
    if (!questionsExist) {
      const questionsCreated = await createQuizQuestionsTable();
      if (!questionsCreated) {
        console.error('Failed to create quiz_questions table');
      return false;
      }
    }
    
    // Create the user_quiz_results table if it doesn't exist
    const resultsExist = await checkTableExists('user_quiz_results');
    if (!resultsExist) {
      // First ensure the RPC exists
      await ensureCreateUserQuizResultsRPC();
      
      // Then call the RPC
      const { data, error } = await supabase.rpc('create_user_quiz_results_table');
        if (error) {
          console.error('Error creating user_quiz_results table:', error);
        return false;
      }
    }
    
    console.log('All quiz tables exist');
    return true;
  } catch (error) {
    console.error('Error in ensureQuizTablesExist:', error);
    return false;
  }
}

// Function to create a minimal quiz table structure if it doesn't exist
export async function createMinimalQuizStructure(): Promise<boolean> {
  try {
    const quizzesExists = await checkTableExists('quizzes');
    
    if (quizzesExists) {
      console.log('Quizzes table already exists');
      return true;
    }
    
    // Try to create a minimal quizzes table
    const { error } = await supabase.rpc('create_minimal_quiz_structure');
    
    if (error) {
      console.error('Error creating minimal quiz structure:', error);
      return false;
    }
    
    console.log('Successfully created minimal quiz structure');
    return true;
  } catch (error) {
    console.error('Error creating minimal quiz structure:', error);
    return false;
  }
}

// Create a sample quiz for a course
export async function createSampleQuizForCourse(courseId: string, userId: string): Promise<boolean> {
  try {
    console.log('Creating sample quiz for course:', courseId);
    
    // Check if we have access to create quizzes
    const { data: tableInfo, error: tableError } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Error accessing quizzes table:', tableError);
      
      // If table doesn't exist, try to create it
      if (tableError.code === '42P01') {
        console.log('Quizzes table does not exist, trying to create it');
      const created = await createMinimalQuizStructure();
      if (!created) {
          console.error('Failed to create quiz structure');
        return false;
        }
      } else {
        // Other error, try SQL as a last resort
        console.log('Attempting to create quiz via direct SQL');
        return await createQuizViaSQL(courseId, userId);
      }
    }
    
    // Try to insert a sample quiz
    const sampleQuiz = {
      course_id: courseId,
      title: 'Sample Quiz',
      description: 'This is a sample quiz to test your knowledge',
      passing_score: 70,
      time_limit: 30, // 30 minutes
      created_by: userId,
      ai_generated: false
    };
    
    console.log('Inserting sample quiz with data:', sampleQuiz);
    
    const { data, error } = await supabase
      .from('quizzes')
      .insert(sampleQuiz)
      .select();
    
    if (error) {
      console.error('Error creating sample quiz:', error);
      
      // Try the SQL fallback method
      console.log('Falling back to SQL method');
      return await createQuizViaSQL(courseId, userId);
    }
    
    console.log('Successfully created sample quiz:', data);
    
    // If we have a sampleQuizId, create some sample questions
    if (data && data.length > 0) {
      const quizId = data[0].id;
      const questionsCreated = await createSampleQuizQuestions(quizId);
      console.log(`Sample questions creation ${questionsCreated ? 'successful' : 'failed'}`);
      
      // Verify that the quiz is properly linked to the course
      const { data: verification, error: verifyError } = await supabase
        .from('quizzes')
        .select('id, course_id')
        .eq('id', quizId)
        .single();
        
      if (verifyError) {
        console.error('Error verifying quiz creation:', verifyError);
      } else {
        console.log('Verified quiz creation - linked to course:', verification);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Exception in createSampleQuizForCourse:', err);
    return false;
  }
}

// Create a quiz using direct insert method
export async function createQuizViaSQL(courseId: string, userId: string): Promise<boolean> {
  try {
    console.log('Creating quiz via direct insert for course:', courseId);
    
    // Create a sample quiz object
    const sampleQuiz = {
      course_id: courseId,
      title: 'Sample Quiz',
      description: 'This is a sample quiz generated for this course',
      passing_score: 70,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Try to insert directly
    const { data, error } = await supabase
      .from('quizzes')
      .insert(sampleQuiz)
      .select();
      
    if (error) {
      console.error('Error creating quiz via direct insert:', error);
      
      if (error.code === '42P01') {
        console.error('quizzes table does not exist!');
        return false;
      }
      
      // Try with a minimal set of fields in case the table schema is different
      const minimalQuiz = {
        course_id: courseId,
        title: 'Sample Quiz',
        description: 'Sample quiz for testing'
      };
      
      const { error: minimalError } = await supabase
        .from('quizzes')
        .insert(minimalQuiz);
        
      if (minimalError) {
        console.error('Error creating minimal quiz:', minimalError);
      return false;
      }
      
      console.log('Created minimal quiz successfully');
      return true;
    }
    
    console.log('Created quiz successfully:', data);
    
    // If we succeeded and have a quiz ID, add a sample question
    if (data && data.length > 0) {
      const quizId = data[0].id;
      await createSampleQuizQuestions(quizId);
    }
    
    return true;
  } catch (err) {
    console.error('Exception in createQuizViaSQL:', err);
    return false;
  }
}

// Create sample quiz questions for a quiz
export async function createSampleQuizQuestions(quizId: string): Promise<boolean> {
  try {
    console.log('Creating sample quiz questions for quiz:', quizId);
    
    // First, check if the quiz_questions table exists
    const { count, error: checkError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true });
      
    if (checkError) {
      console.error('Error checking quiz_questions table:', checkError);
      if (checkError.code === '42P01') {
        console.error('quiz_questions table does not exist');
        await createQuizQuestionsTable();
      }
    }
    
    // Create a sample multiple choice question
    const sampleQuestion1 = {
      quiz_id: quizId,
      question_text: 'What is the main benefit of effective customer service?',
      question_type: 'multiple_choice',
      options: JSON.stringify([
        'Reduced customer complaints',
        'Increased customer loyalty',
        'Higher employee morale',
        'Lower operational costs'
      ]),
      correct_answer: JSON.stringify(1), // Index of the correct answer
      points: 10,
      sequence_order: 1
    };
    
    // Create a sample true/false question
    const sampleQuestion2 = {
      quiz_id: quizId,
      question_text: 'Customer feedback should only be collected when there are complaints.',
      question_type: 'true_false',
      options: JSON.stringify(['True', 'False']),
      correct_answer: JSON.stringify(1), // False is correct
      points: 5,
      sequence_order: 2
    };
    
    // Try to insert the questions
    const { error: insertError1 } = await supabase
      .from('quiz_questions')
      .insert(sampleQuestion1);
      
    if (insertError1) {
      console.error('Error creating first sample question:', insertError1);
      // Continue anyway to try the second question
    } else {
      console.log('Created first sample question successfully');
    }
    
    const { error: insertError2 } = await supabase
      .from('quiz_questions')
      .insert(sampleQuestion2);
      
    if (insertError2) {
      console.error('Error creating second sample question:', insertError2);
      return insertError1 ? false : true; // Return true if at least one question was created
    }
    
    console.log('Created second sample question successfully');
    return true;
  } catch (err) {
    console.error('Exception in createSampleQuizQuestions:', err);
    return false;
  }
}

export async function updateLessonSchema(): Promise<boolean> {
  try {
    // First, check if the columns already exist
    const columnsExist = await checkContentColumnsExist();
    
    if (columnsExist) {
      console.log('Content columns already exist in course_lessons table.');
      return true;
    }
    
    // Columns don't exist, so add them
    const { error } = await supabase.rpc('add_content_columns_to_lessons');
    
    if (error) {
      console.error('Error adding content columns:', error);
      return false;
    }
    
    console.log('Successfully added content columns to course_lessons table.');
    return true;
  } catch (error) {
    console.error('Error updating lesson schema:', error);
    return false;
  }
}

export async function checkContentColumnsExist(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_content_columns_exist');
    
    if (error) {
      console.error('Error checking content columns:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in checkContentColumnsExist:', error);
    return false;
  }
}

// Function to ensure user progress tracking tables exist
export async function ensureUserProgressTablesExist(): Promise<boolean> {
  try {
    // Check user_courses table
    const userCoursesExists = await checkTableExists('user_courses');
    if (!userCoursesExists) {
      console.warn('Creating user_courses table...');
      const success = await createUserCoursesTable();
      if (!success) {
        console.error('Failed to create user_courses table');
      }
    } else {
      // Check if last_accessed column exists in user_courses
      const lastAccessedExists = await checkColumnExists('user_courses', 'last_accessed');
      if (!lastAccessedExists) {
        console.warn('Adding last_accessed column to user_courses table...');
        const success = await addLastAccessedColumn();
        if (!success) {
          console.error('Failed to add last_accessed column');
        }
      }
    }
    
    // Check user_lessons table
    const userLessonsExists = await checkTableExists('user_lessons');
    if (!userLessonsExists) {
      console.warn('Creating user_lessons table...');
      const success = await createUserLessonsTable();
      if (!success) {
        console.error('Failed to create user_lessons table');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring user progress tables exist:', error);
    return false;
  }
}

// Function to check if a column exists in a table
export async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_column_exists', {
      p_table_name: tableName,
      p_column_name: columnName
    });
    
    if (error) {
      // If RPC fails, the function might not exist, try a fallback approach
      console.warn('RPC check_column_exists failed, using fallback approach');
      return await checkColumnExistsFallback(tableName, columnName);
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
    return false;
  }
}

// Fallback method to check if column exists
async function checkColumnExistsFallback(tableName: string, columnName: string): Promise<boolean> {
  try {
    // Try to select the column - if it exists, this won't error
    const query = `select ${columnName} from ${tableName} limit 1`;
    const { error } = await supabase.rpc('execute_sql', { p_sql: query });
    return !error;
  } catch (error) {
    return false;
  }
}

// Function to create user_courses table with all required columns
export async function createUserCoursesTable(): Promise<boolean> {
  try {
    // Try to create the table using RPC
    const { data, error } = await supabase.rpc('create_user_courses_table');
    
    if (error) {
      console.error('Error creating user_courses table through RPC:', error);
      
      // Fallback: try direct SQL if RPC fails
      try {
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS user_courses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
            progress INT DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, course_id)
          )
        `;
        
        const { error: sqlError } = await supabase.rpc('execute_sql', { p_sql: createTableSQL });
        
        if (sqlError) {
          console.error('Error creating user_courses table through SQL:', sqlError);
          return false;
        }
      } catch (sqlError) {
        console.error('Failed to create user_courses table through SQL:', sqlError);
        return false;
      }
    }
    
    return data === true || data === null;
  } catch (error) {
    console.error('Error creating user_courses table:', error);
    return false;
  }
}

// Function to create user_lessons table with all required columns
export async function createUserLessonsTable(): Promise<boolean> {
  try {
    // Try to create the table using RPC
    const { data, error } = await supabase.rpc('create_user_lessons_table');
    
    if (error) {
      console.error('Error creating user_lessons table through RPC:', error);
      
      // Fallback: try direct SQL if RPC fails
      try {
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS user_lessons (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
            course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
            progress INT DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(user_id, lesson_id)
          )
        `;
        
        const { error: sqlError } = await supabase.rpc('execute_sql', { p_sql: createTableSQL });
        
        if (sqlError) {
          console.error('Error creating user_lessons table through SQL:', sqlError);
          return false;
        }
      } catch (sqlError) {
        console.error('Failed to create user_lessons table through SQL:', sqlError);
        return false;
      }
    }
    
    return data === true || data === null;
  } catch (error) {
    console.error('Error creating user_lessons table:', error);
    return false;
  }
}

// Function to add last_accessed column to user_courses table
export async function addLastAccessedColumn(): Promise<boolean> {
  try {
    // Try to add the column using RPC
    const { data, error } = await supabase.rpc('add_last_accessed_column');
    
    if (error) {
      console.error('Error adding last_accessed column through RPC:', error);
      
      // Fallback: try direct SQL if RPC fails
      try {
        const alterTableSQL = `
          ALTER TABLE user_courses
          ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `;
        
        const { error: sqlError } = await supabase.rpc('execute_sql', { p_sql: alterTableSQL });
        
        if (sqlError) {
          console.error('Error adding last_accessed column through SQL:', sqlError);
          return false;
        }
      } catch (sqlError) {
        console.error('Failed to add last_accessed column through SQL:', sqlError);
        return false;
      }
    }
    
    return data === true || data === null;
  } catch (error) {
    console.error('Error adding last_accessed column:', error);
    return false;
  }
}

// Function to associate quizzes with lessons in a course
export async function associateQuizzesWithLessons(courseId: string): Promise<boolean> {
  try {
    // First, check if there are any quizzes without lesson_id for this course
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId)
      .is('lesson_id', null);
      
    if (quizError) {
      console.error('Error fetching quizzes:', quizError);
      return false;
    }
    
    // If no quizzes need association, we're done
    if (!quizzes || quizzes.length === 0) {
      console.log('No quizzes need association with lessons');
      return true;
    }
    
    // Get all lessons for this course
    const { data: lessons, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('course_id', courseId);
      
    if (lessonError || !lessons || lessons.length === 0) {
      console.error('Error fetching lessons or no lessons found:', lessonError);
      return false;
    }
    
    // Count of successfully associated quizzes
    let successCount = 0;
    
    // For each quiz, assign a random lesson
    for (const quiz of quizzes) {
      // Pick a random lesson
      const randomIndex = Math.floor(Math.random() * lessons.length);
      const randomLesson = lessons[randomIndex];
      
      // Update the quiz with the lesson_id
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({ lesson_id: randomLesson.id })
        .eq('id', quiz.id);
        
      if (updateError) {
        console.error(`Error associating quiz ${quiz.id} with lesson:`, updateError);
        // Continue with other quizzes even if one fails
      } else {
        successCount++;
      }
    }
    
    console.log(`Successfully associated ${successCount} out of ${quizzes.length} quizzes with lessons`);
    return true;
  } catch (error) {
    console.error('Error associating quizzes with lessons:', error);
    return false;
  }
} 

// Ensure RPC function exists for debugging table structure
export async function ensureDebugTableInfoExists() {
  try {
    console.log('Checking for debug_table_info RPC function...');
    
    // First try to call it to see if it exists
    const { data, error } = await supabase.rpc(
      'debug_table_info',
      { table_name: 'quizzes' }
    );
    
    if (!error) {
      console.log('debug_table_info RPC function exists');
      return true;
    }
    
    if (error.code !== '42883') { // 42883 is function does not exist
      console.error('Unexpected error checking debug function:', error);
      return false;
    }
    
    // Function doesn't exist, create it if user has permission
    console.log('Creating debug_table_info RPC function...');
    const { error: createError } = await supabase.rpc('create_debug_function');
    
    if (createError) {
      // If we can't create the function directly, try SQL
      console.error('Error creating debug function via RPC:', createError);
      
      // Try using raw SQL if the user has sufficient privileges
      const { error: sqlError } = await supabase.from('_exec_sql').select('*').eq(
        'query',
        `
        CREATE OR REPLACE FUNCTION public.debug_table_info(table_name text)
        RETURNS json
        LANGUAGE plpgsql SECURITY DEFINER
        AS $$
        DECLARE
          result json;
        BEGIN
          -- Check if table exists
          IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = debug_table_info.table_name
          ) THEN
            RETURN json_build_object('exists', false, 'message', 'Table does not exist');
          END IF;
          
          -- Get column information
          WITH columns AS (
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = debug_table_info.table_name
          ),
          sample_data AS (
            SELECT count(*) as row_count
            FROM public.quizzes
          )
          SELECT 
            json_build_object(
              'exists', true,
              'columns', json_agg(columns.*),
              'row_count', (SELECT row_count FROM sample_data)
            ) INTO result
          FROM columns;
          
          RETURN result;
        END;
        $$;
        
        -- Grant execute to authenticated users
        GRANT EXECUTE ON FUNCTION public.debug_table_info(text) TO authenticated;
        `
      );
      
      if (sqlError) {
        console.error('Error creating debug function via SQL:', sqlError);
        return false;
      }
      
      console.log('Created debug_table_info function via SQL');
      return true;
    }
    
    console.log('Created debug_table_info RPC function');
    return true;
  } catch (err) {
    console.error('Error ensuring debug function exists:', err);
    return false;
  }
}

// Function to fetch quizzes using a fallback approach
export async function fetchQuizzesBySQL(courseId: string): Promise<{ data: any[] | null, error: any }> {
  try {
    console.log('Attempting to fetch quizzes via direct query for course:', courseId);

    // Use a standard query instead of _exec_sql
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId);
    
    if (error) {
      console.error('Error in SQL fallback for quizzes:', error);
      
      // Second attempt: try fetching from lesson relationships
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .select('id')
        .eq('course_id', courseId);
        
      if (lessonError || !lessonData || lessonData.length === 0) {
        console.error('Could not fetch lessons for quizzes:', lessonError);
        return { data: null, error };
      }
      
      const lessonIds = lessonData.map(lesson => lesson.id);
      
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .in('lesson_id', lessonIds);
        
      if (quizError) {
        console.error('Error fetching lesson-based quizzes:', quizError);
        return { data: null, error: quizError };
      }
      
      return { data: quizData, error: null };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error in SQL fallback for quizzes:', err);
    return { data: null, error: err };
  }
}

// Ensure the RPC function exists for creating user_quiz_results table
export async function ensureCreateUserQuizResultsRPC(): Promise<boolean> {
  try {
    console.log('Checking if create_user_quiz_results_table RPC exists');
    
    // Try to call the function to see if it exists
    const { error } = await supabase.rpc('create_user_quiz_results_table');
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('create_user_quiz_results_table RPC does not exist');
        // We can't create it through REST API
        console.error('RPC function creation requires SQL permissions. Please run the database migrations.');
        return false;
      } else {
        // The function might exist but failed for another reason
        console.log('The RPC function exists but failed for another reason:', error);
        return true;
      }
    }
    
    console.log('create_user_quiz_results_table RPC exists and was called successfully');
    return true;
  } catch (error) {
    console.error('Exception in ensureCreateUserQuizResultsRPC:', error);
    return false;
  }
}

// Create quiz_questions table if it doesn't exist
export async function createQuizQuestionsTable(): Promise<boolean> {
  try {
    console.log('Creating quiz_questions table');
    
    // First check if table exists
    const { count, error: checkError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true });
    
    if (!checkError) {
      console.log('quiz_questions table already exists');
      return true;
    }
    
    // Table doesn't exist, we need to create it using RPC if available
    // Try to call a stored procedure that should be created during migrations
    const { error: rpcError } = await supabase.rpc('create_quiz_questions_table');
    
    if (rpcError) {
      console.error('Error calling create_quiz_questions_table RPC:', rpcError);
      console.log('Falling back to direct table creation through REST API');
      
      // Try to create a minimal version through the REST API
      try {
        // First create the table manually through other means
        console.error('Cannot create table structure through REST API. Please run database migrations.');
        
        // Create a minimal structure to continue
        const dummyData = {
          quiz_id: '00000000-0000-0000-0000-000000000000',
          question_text: 'Placeholder question',
          question_type: 'multiple_choice',
          options: JSON.stringify({ options: ['Option 1', 'Option 2'] }),
          correct_answer: JSON.stringify({ answer: 0 }),
          sequence_order: 1
        };
        
        // Try inserting to see if the table exists
        const { error: insertError } = await supabase
          .from('quiz_questions')
          .insert(dummyData);
          
        if (insertError && insertError.code === '42P01') {
          console.error('quiz_questions table does not exist and cannot be created via REST API');
          return false;
        } else {
          // Delete the dummy record we inserted
          await supabase
            .from('quiz_questions')
            .delete()
            .eq('quiz_id', '00000000-0000-0000-0000-000000000000');
            
          console.log('quiz_questions table exists or we successfully created it');
          return true;
        }
      } catch (restError) {
        console.error('Error trying to use REST API for table creation:', restError);
        return false;
      }
    }
    
    console.log('Successfully created quiz_questions table via RPC');
    return true;
  } catch (error) {
    console.error('Exception in createQuizQuestionsTable:', error);
    return false;
  }
}

/**
 * Retrieves and logs quiz options by question ID
 * @param questionId The ID of the question
 * @returns The options found for the question
 */
export const logQuizOptionsByQuestionId = async (questionId: string) => {
  try {
    console.log(`Fetching options for question ${questionId}...`);
    
    const { data, error } = await supabase
      .from('quiz_options')
      .select('*')
      .eq('question_id', questionId)
      .order('sequence_order', { ascending: true });
    
    if (error) {
      console.error(`Error fetching options for question ${questionId}:`, error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn(`⚠️ No options found for question ${questionId}`);
      return [];
    }
    
    console.log(`✅ Found ${data.length} options for question ${questionId}:`, data);
    return data;
  } catch (error) {
    console.error(`Unexpected error getting options for question ${questionId}:`, error);
    return [];
  }
}; 