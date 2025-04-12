
import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  requiredRoles?: Array<'admin' | 'manager' | 'staff' | 'trainee'>;
  showSidebar?: boolean;
}

export function Layout({ 
  children, 
  requiredRoles = [],
  showSidebar = true 
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
  if (profile && requiredRoles.length > 0 && !requiredRoles.some(role => hasRole([role]))) {
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

  // Check if current path is admin path to avoid double sidebar
  const isAdminPath = location.pathname.startsWith('/admin');
  const showSidebarFinal = showSidebar && (!isAdminPath || location.pathname === '/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {showSidebarFinal && <Sidebar />}
        <main className={`flex-1 ${getBgColor()} overflow-auto`}>
          {children}
        </main>
      </div>
    </div>
  );
}
