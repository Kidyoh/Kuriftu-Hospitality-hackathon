# User Analytics Setup Guide

This guide explains how to set up and use the User Analytics feature.

## Overview

The User Analytics component provides insights into user learning behavior and progress. It displays:
- Course enrollment and completion statistics
- Time spent on courses
- Quiz performance metrics
- Activity history
- Course-by-course progress details

## Current Implementation

Currently, the UI is implemented in `src/components/admin/UserAnalytics.tsx` with **mock data**. The database function is not yet implemented in your Supabase instance.

## Setup Steps

### 1. Create the Database Function

To implement the actual database functionality, you need to create a PostgreSQL function in your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to "SQL Editor"
3. Create a new query
4. Copy and paste the content from `sql/user_analytics_function.sql`
5. Execute the SQL query

This will create a function called `get_user_analytics` that can be invoked from your application.

### 2. Database Tables Required

The function assumes you have the following tables/structure:
- `profiles` - User profile information
- `course_enrollments` - Course enrollment data with progress
- `lessons` and `lesson_progress` - Lesson completion tracking
- `quizzes` and `quiz_attempts` - Quiz attempt tracking
- `user_activity_sessions` - Time tracking data
- `course_progress_history` - Historical progress data
- `activity_logs` - User activity logging

If these tables don't exist or have different structures, you'll need to modify the SQL function accordingly.

### 3. Update the React Component

After implementing the database function:

1. Open `src/components/admin/UserAnalytics.tsx`
2. Find the `fetchUserEngagement` function
3. Uncomment the actual API call section and remove the mock data section

## Testing and Troubleshooting

- Test with real user IDs after implementing the database function
- Check browser console for errors
- Verify SQL function with direct queries before connecting to the UI
- Add logging to trace data flow

## Next Steps for Enhancement

1. **Add Export Functionality**: Allow exporting analytics as CSV/PDF
2. **Implement Filtering**: Add filters for different metrics
3. **Visual Improvements**: Add more charts and visualizations
4. **Comparative Analysis**: Compare user performance against averages
5. **Recommendations**: Generate learning recommendations based on analytics

## Questions or Issues?

Contact the development team for support or to suggest improvements. 