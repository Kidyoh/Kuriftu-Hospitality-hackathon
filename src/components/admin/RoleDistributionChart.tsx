import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

type RoleCount = {
  admin: number;
  manager: number;
  staff: number;
  trainee: number;
};

export function RoleDistributionChart() {
  const [roleData, setRoleData] = useState<RoleCount>({
    admin: 0,
    manager: 0,
    staff: 0,
    trainee: 0
  });

  useEffect(() => {
    async function fetchRoleDistribution() {
      const { data, error } = await supabase
        .from('users')
        .select('role');

      if (error) {
        console.error('Error fetching role distribution:', error);
        return;
      }

      const counts = data.reduce((acc: RoleCount, user) => {
        const role = user.role as keyof RoleCount;
        acc[role] = (acc[role] ?? 0) + 1;
        return acc;
      }, {
        admin: 0,
        manager: 0,
        staff: 0,
        trainee: 0
      });

      setRoleData(counts);
    }

    fetchRoleDistribution();
  }, []);

  const chartData = {
    labels: ['Admin', 'Manager', 'Staff', 'Trainee'],
    datasets: [
      {
        data: [
          roleData.admin,
          roleData.manager,
          roleData.staff,
          roleData.trainee
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="w-full h-64">
      <Pie data={chartData} options={{ maintainAspectRatio: false }} />
    </div>
  );
} 