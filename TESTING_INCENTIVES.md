# Testing Incentives System & Login Streak

This guide outlines how to test the newly implemented incentives system and login streak functionality.

## Prerequisites

1. Ensure you have run all the required migration scripts in the correct order:
   ```bash
   psql -U your_user -d your_database -f sql/ensure_base_tables.sql
   psql -U your_user -d your_database -f sql/setup_rls_policies.sql
   psql -U your_user -d your_database -f sql/fix_missing_tables.sql
   psql -U your_user -d your_database -f sql/update_achievements.sql
   psql -U your_user -d your_database -f sql/login_streak_migration.sql
   ```

2. Start the development server:
   ```bash
   pnpm run dev
   ```

## Testing Login Streak

The login streak is automatically recorded whenever a user logs in:

1. **Initial Login**:
   - Log in to the application
   - Visit the Dashboard
   - Look for the "Login Streak" tab in the side panel
   - You should see a streak of 1 day

2. **Testing Multiple Days**:
   - For testing purposes, you can manually insert records into the `user_login_streaks` table:
   ```sql
   -- Example to set a 5-day streak for testing
   INSERT INTO public.user_login_streaks (
     user_id, last_login, current_streak, longest_streak
   ) VALUES (
     'your-user-id', 
     CURRENT_TIMESTAMP, 
     5, 
     5
   )
   ON CONFLICT (user_id) 
   DO UPDATE SET 
     current_streak = 5, 
     longest_streak = 5;
   ```

3. **Daily Logins**:
   - The streak increases by 1 each day the user logs in
   - If they miss a day, the streak resets to 1
   - The longest streak is always preserved

## Testing Achievements

1. **Viewing Achievements**:
   - Visit the Dashboard to see a preview of your achievements
   - Click "View all achievements" or navigate to `/achievements` to see the full list
   - Achievements are grouped by category and show progress

2. **Completing Achievements**:
   - Course completion achievements: Complete a course
   - Lesson completion achievements: Complete multiple lessons
   - Perfect quiz achievements: Score 100% on quizzes
   - Login streak achievements: Login consecutively for the required number of days

3. **Testing Specific Achievements**:
   ```sql
   -- Manually award an achievement for testing
   INSERT INTO public.user_achievements (
     user_id, achievement_id, progress, completed, completed_at
   ) VALUES (
     'your-user-id',
     'achievement-id',
     100,
     TRUE,
     CURRENT_TIMESTAMP
   );
   
   -- Award points for the achievement
   INSERT INTO public.point_transactions (
     user_id, amount, description, reference_type, reference_id
   ) VALUES (
     'your-user-id',
     100,
     'Achievement completed: Test achievement',
     'achievement',
     'achievement-id'
   );
   ```

## Testing Points and Rewards

1. **Viewing Points**:
   - Navigate to `/incentives` to see your points and transaction history
   - The total points are displayed at the top
   - Recent transactions are listed below

2. **Testing Point Transactions**:
   ```sql
   -- Add points manually for testing
   INSERT INTO public.point_transactions (
     user_id, amount, description
   ) VALUES (
     'your-user-id',
     50,
     'Test transaction: Completed module'
   );
   ```

## Automated Testing via Frontend Actions

To test the full flow via typical user actions:

1. **Course Completion Achievement**:
   - Enroll in a course
   - Complete all lessons
   - Mark the course as complete
   - Check achievements to see the "Course Completer" achievement

2. **Login Streak Achievement**:
   - Log in every day for 7 consecutive days
   - On day 7, check achievements to see the "Learning Streak" achievement

3. **Quiz Master Achievement**:
   - Take 5 different quizzes and score 100% on each
   - Check achievements to see the "Quiz Master" achievement

## Admin Testing

As an admin user, you can:

1. **View User Achievements**:
   - Log in as an admin
   - Navigate to user management
   - Select a user to view their achievements and points

2. **Award Points Manually**:
   - You can add point transactions for users through the admin interface
   - These will show up in their points history

## Troubleshooting

If achievements or login streaks aren't working as expected:

1. **Check Database Tables**:
   ```sql
   -- Check achievements table
   SELECT * FROM public.achievements;
   
   -- Check user achievements
   SELECT * FROM public.user_achievements WHERE user_id = 'your-user-id';
   
   -- Check login streaks
   SELECT * FROM public.user_login_streaks WHERE user_id = 'your-user-id';
   
   -- Check point transactions
   SELECT * FROM public.point_transactions WHERE user_id = 'your-user-id';
   ```

2. **Check RLS Policies**:
   - Ensure that the correct RLS policies are in place
   - Users should be able to view their own data
   - Admins should be able to view all data

3. **Trigger Functions**:
   - Make sure the trigger functions for achievement tracking are working
   - Test by completing a course or lesson and checking if related achievements update 