import { supabase } from '@/integrations/supabase/client';

interface UserActivityData {
  date: string;
  active_users: number;
  new_users: number;
  total_users: number;
}

/**
 * Fetches user activity data for the specified time range
 */
export async function getUserActivityData(timeRange: string): Promise<{
  data: UserActivityData[];
  error: any;
}> {
  try {
    let daysToLookBack: number;
    
    // Convert timeRange to number of days
    switch (timeRange) {
      case 'last7days':
        daysToLookBack = 7;
        break;
      case 'last30days':
        daysToLookBack = 30;
        break;
      case 'last90days':
        daysToLookBack = 90;
        break;
      case 'lastYear':
        daysToLookBack = 365;
        break;
      default:
        daysToLookBack = 30; // Default to 30 days
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);

    // Get daily active users and new users
    const { data, error } = await supabase
      .from('user_login_streaks')
      .select(`
        last_login,
        profiles!inner(
          joined_at
        )
      `)
      .gte('last_login', startDate.toISOString());

    if (error) throw error;

    // Process the data to get daily counts
    const dailyData: { [key: string]: UserActivityData } = {};
    let runningTotalUsers = 0;

    // Initialize the data structure for each day
    for (let i = 0; i <= daysToLookBack; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyData[dateStr] = {
        date: dateStr,
        active_users: 0,
        new_users: 0,
        total_users: 0
      };
    }

    // Count active users per day
    if (data) {
      data.forEach(record => {
        const loginDate = new Date(record.last_login).toISOString().split('T')[0];
        const joinDate = new Date(record.profiles.joined_at).toISOString().split('T')[0];
        
        if (dailyData[loginDate]) {
          dailyData[loginDate].active_users++;
        }
        
        if (dailyData[joinDate]) {
          dailyData[joinDate].new_users++;
        }
      });
    }

    // Calculate running total of users
    const sortedDates = Object.keys(dailyData).sort();
    sortedDates.forEach(date => {
      runningTotalUsers += dailyData[date].new_users;
      dailyData[date].total_users = runningTotalUsers;
    });

    // Convert to array and sort by date
    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return { data: result, error: null };
  } catch (err) {
    console.error('Error fetching user activity data:', err);
    return { data: [], error: err };
  }
} 