
import React from 'react';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { ProgressSection } from '@/components/dashboard/ProgressSection';
import { RecommendedCourses } from '@/components/dashboard/RecommendedCourses';
import { AchievementSection } from '@/components/dashboard/AchievementSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, BarChart2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  
  // Personalized greeting based on user role
  const getGreeting = () => {
    if (!profile) return {};
    
    switch(profile.role) {
      case 'admin':
        return { 
          title: "Admin Dashboard",
          description: "Manage courses, learning paths, and users",
          action: () => navigate('/admin')
        };
      case 'manager':
        return { 
          title: "Manager Dashboard",
          description: "Monitor team progress and analytics",
          action: () => navigate('/team')
        };
      case 'staff':
        return { 
          title: "Staff Learning Portal",
          description: "Continue your learning journey",
          action: () => navigate('/courses')
        };
      default:
        return { 
          title: "Trainee Portal",
          description: "Start your learning journey",
          action: () => navigate('/courses')
        };
    }
  };
  
  const greeting = getGreeting();
  const isAdmin = hasRole(['admin']);
  const isManager = hasRole(['admin', 'manager']);
  const isStaff = hasRole(['admin', 'manager', 'staff']);

  return (
    <div className="container py-6 space-y-6">
      <WelcomeCard 
        name={profile ? `${profile.first_name} ${profile.last_name}` : undefined} 
        role={profile?.role === 'trainee' ? 'Trainee' : profile?.position || undefined}
      />
      
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer" onClick={() => navigate('/admin/courses')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Course Management</CardTitle>
              <CardDescription>Manage learning content</CardDescription>
            </CardHeader>
            <CardContent>
              <BookOpen className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer" onClick={() => navigate('/admin/learning-paths')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Learning Paths</CardTitle>
              <CardDescription>Define learning journeys</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart2 className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer" onClick={() => navigate('/admin?tab=users')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription>Manage employee accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Users className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer" onClick={() => navigate('/analytics')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Analytics</CardTitle>
              <CardDescription>Learning metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart2 className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
        </div>
      )}
      
      {isManager && !isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer" onClick={() => navigate('/team')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Team Management</CardTitle>
              <CardDescription>Manage your team</CardDescription>
            </CardHeader>
            <CardContent>
              <Users className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer" onClick={() => navigate('/analytics')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Analytics</CardTitle>
              <CardDescription>Team performance</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart2 className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer" onClick={() => navigate('/schedule')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Schedule</CardTitle>
              <CardDescription>Team schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
        </div>
      )}
      
      {isStaff && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <RecommendedCourses />
          </div>
          
          <div className="space-y-6">
            <ProgressSection />
            <AchievementSection />
          </div>
        </div>
      )}
      
      {!isStaff && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <RecommendedCourses />
          </div>
          
          <div className="space-y-6">
            <ProgressSection />
            <AchievementSection />
          </div>
        </div>
      )}
    </div>
  );
}
