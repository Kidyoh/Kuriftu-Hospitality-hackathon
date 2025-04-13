import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserLoginStreak, getUserLoginStreak } from '@/utils/incentivesUtils';

export interface LoginStreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogin: Date | null;
  loading: boolean;
  error: any;
}

/**
 * Hook to manage and track user login streaks
 * Updates the streak when the user logs in and provides streak information
 */
export function useLoginStreak(): LoginStreakData {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<LoginStreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastLogin: null,
    loading: true,
    error: null
  });

  // Function to fetch the current streak data
  const fetchStreakData = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await getUserLoginStreak(user.id);
      
      if (error) {
        console.error('Error fetching login streak:', error);
        setStreakData(prev => ({ ...prev, error, loading: false }));
        return;
      }
      
      if (data) {
        setStreakData({
          currentStreak: data.current_streak || 0,
          longestStreak: data.longest_streak || 0,
          lastLogin: data.last_login ? new Date(data.last_login) : null,
          loading: false,
          error: null
        });
      } else {
        setStreakData(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Error in useLoginStreak:', err);
      setStreakData(prev => ({ ...prev, error: err, loading: false }));
    }
  };

  // Function to update the user's streak
  const updateStreak = async () => {
    if (!user?.id) return;
    
    try {
      const { success, error } = await updateUserLoginStreak(user.id);
      if (error) {
        console.error('Error updating login streak:', error);
        setStreakData(prev => ({ ...prev, error }));
        return;
      }
      
      // Fetch the updated streak data
      await fetchStreakData();
    } catch (err) {
      console.error('Error updating login streak:', err);
      setStreakData(prev => ({ ...prev, error: err }));
    }
  };

  // Update streak on initial load
  useEffect(() => {
    if (user?.id) {
      updateStreak();
    } else {
      setStreakData(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  return streakData;
}

export default useLoginStreak; 