import React, { useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PointsCard from '@/components/incentives/PointsCard';
import AchievementsCard from '@/components/incentives/AchievementsCard';
import LoginStreakCard from '@/components/incentives/LoginStreakCard';

const Incentives = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Incentives & Rewards</h1>
        <p className="text-muted-foreground">
          Track your progress and earn rewards
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <PointsCard />
            <LoginStreakCard />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <AchievementsCard />
        </div>
      </div>
    </div>
  );
};

export default Incentives; 