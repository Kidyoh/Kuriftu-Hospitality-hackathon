import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPoints, getPointTransactions, PointTransaction, UserPoints } from '@/utils/incentivesUtils';
import { formatDistanceToNow } from 'date-fns';

interface PointTransactionItemProps {
  transaction: PointTransaction;
}

const PointTransactionItem: React.FC<PointTransactionItemProps> = ({ transaction }) => {
  const { amount, description, created_at } = transaction;
  const isPositive = amount > 0;
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">{description}</span>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
        </span>
      </div>
      <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{amount}
      </span>
    </div>
  );
};

export interface PointsCardProps {
  transactionLimit?: number;
  className?: string;
}

export const PointsCard: React.FC<PointsCardProps> = ({
  transactionLimit = 5,
  className = '',
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);

  useEffect(() => {
    const fetchPointsData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // Fetch user's total points
        const pointsData = await getUserPoints(user.id);
        if (pointsData.data && !pointsData.error) {
          setPoints(pointsData.data.total_points || 0);
        }
        
        // Fetch recent transactions
        const { data, error } = await getPointTransactions(user.id, transactionLimit);
        if (!error && data) {
          setTransactions(data);
        }
      } catch (err) {
        console.error('Error fetching points data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPointsData();
  }, [user?.id, transactionLimit]);

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle>Your Points</CardTitle>
        <CardDescription>
          Earn points by completing courses and achievements
        </CardDescription>
        
        {!loading ? (
          <div className="mt-4 flex items-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mr-4">
              <span className="text-primary text-2xl font-bold">🏆</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">{points}</div>
              <div className="text-sm text-gray-500">Total Points</div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center">
            <Skeleton className="w-16 h-16 rounded-full mr-4" />
            <div>
              <Skeleton className="w-20 h-8" />
              <Skeleton className="w-32 h-4 mt-1" />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="mb-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recent Transactions
          </h3>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div>
              {transactions.map((transaction) => (
                <PointTransactionItem 
                  key={transaction.id} 
                  transaction={transaction} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">
                No transactions yet. Complete activities to earn points.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      {transactions.length > 0 && (
        <CardFooter className="flex justify-between">
          <a 
            href="/rewards" 
            className="text-sm text-primary hover:underline"
          >
            Spend Points
          </a>
          <a 
            href="/transactions" 
            className="text-sm text-gray-600 hover:underline"
          >
            View All Transactions
          </a>
        </CardFooter>
      )}
    </Card>
  );
};

export default PointsCard; 