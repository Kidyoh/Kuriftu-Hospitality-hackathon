import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'badge' | 'certificate' | 'points' | 'resource';
  icon_url: string | null;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  earned_at: string;
  claimed: boolean;
  claimed_at: string | null;
  reward?: Reward;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  required_progress: number;
  category: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  achievement: Achievement;
}

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  last_updated: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  created_at: string;
  reference_id?: string;
  reference_type?: string;
}

export interface AchievementSummary {
  total: number;
  completed: number;
  in_progress: number;
  completion_percentage: number;
  total_points_earned: number;
}

/**
 * Get all available achievements
 */
export async function getAchievements(): Promise<{ data: Achievement[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Get all achievements for the current user
 */
export async function getUserAchievements(userId: string): Promise<{ 
  data: (UserAchievement & { achievement: Achievement })[] | null; 
  error: PostgrestError | null 
}> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  return { data, error };
}

/**
 * Get all rewards earned by the current user
 */
export async function getUserRewards(userId: string): Promise<{ 
  data: (UserReward & { reward: Reward })[] | null; 
  error: PostgrestError | null 
}> {
  const { data, error } = await supabase
    .from('user_rewards')
    .select('*, reward:rewards(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  return { data, error };
}

/**
 * Get user's total points
 */
export async function getUserPoints(userId: string): Promise<{ 
  data: UserPoints | null; 
  error: PostgrestError | null 
}> {
  const { data, error } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .single();

  // If no record exists yet, return 0 points
  if (!data && !error) {
    return { 
      data: {
        id: '',
        user_id: userId,
        total_points: 0,
        last_updated: new Date().toISOString()
      }, 
      error: null 
    };
  }

  return { data, error };
}

/**
 * Get user's point transaction history
 */
export async function getPointTransactions(userId: string, limit = 10): Promise<{ 
  data: PointTransaction[] | null; 
  error: PostgrestError | null 
}> {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Claim a reward that the user has earned
 */
export async function claimReward(userRewardId: string): Promise<{ 
  data: UserReward | null; 
  error: PostgrestError | null 
}> {
  const { data, error } = await supabase
    .from('user_rewards')
    .update({ 
      claimed: true,
      claimed_at: new Date().toISOString()
    })
    .eq('id', userRewardId)
    .select()
    .single();

  return { data, error };
}

/**
 * Get user's achievement progress summary
 */
export async function getUserAchievementSummary(userId: string): Promise<{
  data: AchievementSummary | null;
  error: any;
}> {
  try {
    // First try to get the summary using the RPC
    const { data, error } = await supabase
      .rpc('get_user_achievement_summary', { user_id: userId });
      
    if (error) {
      console.error('Error fetching achievement summary:', error);
      
      // Fallback: Calculate summary manually if RPC fails
      const [achievementsResult, userAchievementsResult] = await Promise.all([
        supabase.from('achievements').select('count').single(),
        supabase.from('user_achievements')
          .select('id, progress, completed')
          .eq('user_id', userId)
      ]);
      
      if (achievementsResult.error || userAchievementsResult.error) {
        return { data: null, error: achievementsResult.error || userAchievementsResult.error };
      }
      
      const total = achievementsResult.data?.count || 0;
      const userAchievements = userAchievementsResult.data || [];
      const completed = userAchievements.filter(a => a.completed).length;
      const inProgress = userAchievements.filter(a => !a.completed && a.progress > 0).length;
      
      // Get points from point transactions
      const { data: pointsData } = await supabase
        .from('point_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('reference_type', 'achievement');
        
      const totalPoints = pointsData?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      
      return {
        data: {
          total,
          completed,
          in_progress: inProgress,
          completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          total_points_earned: totalPoints
        },
        error: null
      };
    }
    
    return { 
      data: data || {
        total: 0,
        completed: 0,
        in_progress: 0,
        completion_percentage: 0,
        total_points_earned: 0
      }, 
      error: null 
    };
  } catch (err) {
    console.error('Error in getUserAchievementSummary:', err);
    return { data: null, error: err };
  }
}

/**
 * Manually trigger achievement check for a user
 * This can be called after significant user actions
 */
export async function checkUserAchievements(userId: string): Promise<{ 
  success: boolean; 
  error: PostgrestError | null 
}> {
  try {
    console.log(`Checking achievements for user ${userId}`);
    const { data, error } = await supabase
      .rpc('check_user_achievements', { p_user_id: userId });
    
    if (error) {
      console.error('Error calling check_user_achievements RPC:', error);
      
      // If the error is 42P01 (relation does not exist), suggest running the migrations
      if (error.code === '42P01') {
        console.error('Database table missing. Please ensure all migrations are run.');
        return { 
          success: false, 
          error: {
            ...error,
            message: "Required database table missing. Please run the migration scripts."
          } 
        };
      }
      
      return { success: false, error };
    }
    
    console.log('Achievement check completed successfully');
    return { success: true, error: null };
  } catch (err) {
    console.error('Exception in checkUserAchievements:', err);
    return { 
      success: false, 
      error: err instanceof Error ? { message: err.message, code: 'UNEXPECTED_ERROR' } as any : null 
    };
  }
}

/**
 * Add points to a user's account with a description
 */
export async function awardPoints(
  userId: string, 
  amount: number, 
  description: string, 
  referenceType?: string, 
  referenceId?: string
): Promise<{ 
  success: boolean; 
  error: PostgrestError | null 
}> {
  try {
    console.log(`Awarding ${amount} points to user ${userId} for ${description}`);
    
    // Validate inputs
    if (!userId) {
      console.error('Cannot award points: Missing user ID');
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Missing user ID' } as any };
    }
    
    if (!amount || amount <= 0) {
      console.error('Cannot award points: Invalid amount');
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Points amount must be positive' } as any };
    }
    
    if (!description) {
      console.error('Cannot award points: Missing description');
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Missing description' } as any };
    }
    
    const { error } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount,
        description,
        reference_type: referenceType,
        reference_id: referenceId
      });
      
    if (error) {
      console.error('Error awarding points:', error);
      
      // If the error is 42P01 (relation does not exist), suggest running the migrations
      if (error.code === '42P01') {
        console.error('point_transactions table missing. Please ensure all migrations are run.');
        return { 
          success: false, 
          error: {
            ...error,
            message: "Required database table missing. Please run the migration scripts."
          } 
        };
      }
      
      return { success: false, error };
    }
    
    console.log(`Successfully awarded ${amount} points to user ${userId}`);
    return { success: true, error: null };
  } catch (err) {
    console.error('Exception in awardPoints:', err);
    return { 
      success: false, 
      error: err instanceof Error ? { message: err.message, code: 'UNEXPECTED_ERROR' } as any : null 
    };
  }
}

/**
 * Award a specific reward to a user
 */
export async function awardReward(
  userId: string, 
  rewardId: string
): Promise<{ 
  success: boolean; 
  error: PostgrestError | null 
}> {
  const { error } = await supabase
    .from('user_rewards')
    .insert({
      user_id: userId,
      reward_id: rewardId,
      earned_at: new Date().toISOString(),
      claimed: false
    });

  return { success: !error, error };
}

/**
 * Get user's point transactions with pagination (with offset)
 */
export const getPointTransactionsWithOffset = async (
  userId: string,
  limit: number = 10,
  offset: number = 0
) => {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    return { data, error };
  } catch (err) {
    console.error('Error in getPointTransactions:', err);
    return { data: null, error: err };
  }
};

/**
 * Award points to a user and return the inserted data
 */
export const awardPointsWithData = async (
  userId: string,
  amount: number,
  description: string,
  referenceId?: string,
  referenceType?: string
) => {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .insert([
        {
          user_id: userId,
          amount,
          description,
          reference_id: referenceId,
          reference_type: referenceType
        }
      ])
      .select();
      
    return { data, error };
  } catch (err) {
    console.error('Error in awardPoints:', err);
    return { data: null, error: err };
  }
};

/**
 * Update achievement progress for a user
 */
export const updateAchievementProgress = async (
  userId: string,
  achievementId: string,
  progress: number
) => {
  try {
    // First get the achievement to check requirements
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', achievementId)
      .single();
      
    if (achievementError || !achievement) {
      return { data: null, error: achievementError || new Error('Achievement not found') };
    }
    
    // Check if user already has this achievement
    const { data: existingUserAchievement, error: userAchievementError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();
      
    const completed = progress >= achievement.required_progress;
    const now = new Date().toISOString();
    
    let result;
    
    if (existingUserAchievement) {
      // Only update if new progress is higher or it's being completed for the first time
      if (progress > existingUserAchievement.progress || 
         (completed && !existingUserAchievement.completed)) {
        
        const updateData: any = { progress };
        
        // If completing for the first time
        if (completed && !existingUserAchievement.completed) {
          updateData.completed = true;
          updateData.completed_at = now;
          
          // Award points when completing achievement
          await awardPointsWithData(
            userId, 
            achievement.points, 
            `Completed achievement: ${achievement.title}`,
            achievement.id,
            'achievement'
          );
        }
        
        result = await supabase
          .from('user_achievements')
          .update(updateData)
          .eq('id', existingUserAchievement.id)
          .select();
      } else {
        // No update needed
        return { 
          data: existingUserAchievement, 
          error: null, 
          message: 'No update needed' 
        };
      }
    } else {
      // Create new user achievement
      result = await supabase
        .from('user_achievements')
        .insert([{
          user_id: userId,
          achievement_id: achievementId,
          progress,
          completed,
          completed_at: completed ? now : null
        }])
        .select();
        
      // Award points if completed on creation
      if (completed) {
        await awardPointsWithData(
          userId, 
          achievement.points, 
          `Completed achievement: ${achievement.title}`,
          achievement.id,
          'achievement'
        );
      }
    }
    
    return { data: result.data, error: result.error };
  } catch (err) {
    console.error('Error in updateAchievementProgress:', err);
    return { data: null, error: err };
  }
};

/**
 * Get user's login streak information
 */
export async function getUserLoginStreak(userId: string): Promise<{ 
  data: {
    current_streak: number;
    longest_streak: number;
    last_login: string;
  } | null; 
  error: any 
}> {
  try {
    const { data, error } = await supabase
      .from('user_login_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching login streak:', error);
      return { data: null, error };
    }
    
    return { 
      data: data ? {
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
        last_login: data.last_login
      } : null, 
      error: null 
    };
  } catch (err) {
    console.error('Error in getUserLoginStreak:', err);
    return { data: null, error: err };
  }
}

/**
 * Update user login streak
 */
export async function updateUserLoginStreak(userId: string): Promise<{ 
  success: boolean; 
  error: any 
}> {
  try {
    const { data, error } = await supabase
      .rpc('update_user_login_streak', { p_user_id: userId });
    
    if (error) {
      console.error('Error updating login streak:', error);
      // If there's an ambiguous column error, we should notify the user to run the migration script
      if (error.code === '42702' && error.message.includes('ambiguous')) {
        return { 
          success: false, 
          error: {
            ...error,
            message: "Please run the login_streak_migration.sql script to fix database functions. The column reference 'current_streak' is ambiguous."
          }
        };
      }
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Error in updateUserLoginStreak:', err);
    return { success: false, error: err };
  }
}

/**
 * Format streak message for display
 */
export function formatStreakMessage(currentStreak: number): string {
  if (currentStreak <= 0) {
    return "Start your learning streak today!";
  } else if (currentStreak === 1) {
    return "You've started your learning streak! Come back tomorrow to continue.";
  } else if (currentStreak < 5) {
    return `You're on a ${currentStreak}-day streak! Keep it going!`;
  } else if (currentStreak < 10) {
    return `Impressive! ${currentStreak}-day learning streak. You're building great habits!`;
  } else if (currentStreak < 30) {
    return `Amazing dedication! ${currentStreak}-day streak and counting!`;
  } else {
    return `Extraordinary commitment! ${currentStreak}-day learning streak. You're a learning champion!`;
  }
} 