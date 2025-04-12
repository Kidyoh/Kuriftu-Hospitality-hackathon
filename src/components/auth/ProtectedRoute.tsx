import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: Array<'admin' | 'manager' | 'staff' | 'trainee'>;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = []
}: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  // While we're loading auth state, show a nice loading indicator
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  // If not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // If this route has role requirements, check them
  if (requiredRoles.length > 0 && profile) {
    if (!requiredRoles.includes(profile.role)) {
      // User doesn't have the required role, redirect to dashboard
      return <Navigate to="/" replace />;
    }
  }

  // If a user hasn't completed onboarding and is not already on the onboarding route
  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If children are provided, render them
  // Otherwise, render the Outlet for nested routes
  return <>{children ? children : <Outlet />}</>;
}
