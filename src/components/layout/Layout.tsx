import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  requiredRoles?: Array<'admin' | 'manager' | 'staff' | 'trainee'>;
  showSidebar?: boolean;
  customHeader?: React.ReactNode;
}

export function Layout({ 
  children, 
  requiredRoles = [],
  showSidebar = true,
  customHeader
}: LayoutProps) {
  const { profile, isLoading, hasRole } = useAuth();
  const location = useLocation();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kuriftu-brown"></div>
        <span className="ml-3 text-lg font-medium">Loading...</span>
      </div>
    );
  }

  // Check if user has required role access
  if (profile && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    // Redirect unauthorized users to the dashboard
    return <Navigate to="/" replace />;
  }
  
  // Determine background color based on user role
  const getBgColor = () => {
    if (!profile) return "bg-background";
    
    switch(profile.role) {
      case 'admin':
        return "bg-background border-l-4 border-kuriftu-brown";
      case 'manager':
        return "bg-background border-l-4 border-kuriftu-green";
      case 'staff':
        return "bg-background border-l-4 border-kuriftu-orange";
      default:
        return "bg-background border-l-4 border-kuriftu-cream";
    }
  };

  // Check if the sidebar should be shown
  // Always show sidebar for admin pages that need it (course management, lessons, etc.)
  const isAdminCoursesPath = location.pathname.startsWith('/admin/courses');
  const isAdminLearningPath = location.pathname.startsWith('/admin/learning-paths');
  
  // Determine if we should show the sidebar
  const shouldShowSidebar = showSidebar && (
    !location.pathname.startsWith('/admin') || 
    location.pathname === '/admin' || 
    isAdminCoursesPath || 
    isAdminLearningPath
  );

  return (
    <div className="min-h-screen flex flex-col">
      {customHeader || <Header />}
      <div className="flex-1 flex">
        {shouldShowSidebar && <Sidebar />}
        <main className={cn(`flex-1 ${getBgColor()} overflow-auto p-4`)}>
          {children}
        </main>
      </div>
    </div>
  );
}
