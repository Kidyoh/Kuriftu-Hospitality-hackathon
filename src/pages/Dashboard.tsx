
import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { ProgressSection } from '@/components/dashboard/ProgressSection';
import { RecommendedCourses } from '@/components/dashboard/RecommendedCourses';
import { AchievementSection } from '@/components/dashboard/AchievementSection';

export default function Dashboard() {
  return (
    <Layout>
      <div className="container py-6 space-y-6">
        <WelcomeCard />
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <RecommendedCourses />
          </div>
          
          <div className="space-y-6">
            <ProgressSection />
            <AchievementSection />
          </div>
        </div>
      </div>
    </Layout>
  );
}
