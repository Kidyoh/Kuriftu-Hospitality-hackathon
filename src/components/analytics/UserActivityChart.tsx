import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { getUserActivityData } from '@/utils/analyticsUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface UserActivityChartProps {
  timeRange: string;
  className?: string;
}

export const UserActivityChart: React.FC<UserActivityChartProps> = ({ timeRange, className = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await getUserActivityData(timeRange);
      if (error) {
        setError(error);
      } else {
        setActivityData(data);
      }
      setLoading(false);
    };

    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>Active users over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>Error loading activity data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-destructive">
            Failed to load activity data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name}:
              </span>{' '}
              {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>User Activity</CardTitle>
        <CardDescription>Active users over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activityData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                className="text-muted-foreground"
              />
              <YAxis className="text-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="active_users"
                name="Active Users"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="new_users"
                name="New Users"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="total_users"
                name="Total Users"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}; 