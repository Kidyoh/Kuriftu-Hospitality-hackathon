
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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

  // While we're loading auth state, show nothing
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
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

  // If a user hasn't completed onboarding and is not on the onboarding route
  // and the current path is not already the onboarding path, redirect to onboarding
  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If children are provided, render them
  // Otherwise, render the Outlet for nested routes
  return <>{children ? children : <Outlet />}</>;
}
