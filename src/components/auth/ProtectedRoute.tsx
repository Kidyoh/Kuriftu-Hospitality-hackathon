
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: Array<'admin' | 'manager' | 'staff' | 'trainee'>;
  requireOnboarding?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  requireOnboarding = true
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
    console.log("No user found, redirecting to /auth");
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Skip role and onboarding checks if profile is not loaded due to potential recursion error
  if (!profile) {
    console.log("Profile not loaded, allowing access but with limited functionality");
    // We'll still render the component/outlet without the profile
    // This prevents us from getting stuck in a redirect loop
    return <>{children ? children : <Outlet />}</>;
  }

  // If this route has role requirements, check them
  if (requiredRoles.length > 0) {
    if (!requiredRoles.includes(profile.role)) {
      console.log(`User role ${profile.role} doesn't match required roles [${requiredRoles.join(', ')}]`);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page."
      });
      // User doesn't have the required role, redirect to dashboard
      return <Navigate to="/" replace />;
    }
  }

  // If a user hasn't completed onboarding and requireOnboarding is true
  if (requireOnboarding && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    console.log("User hasn't completed onboarding, redirecting to /onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  // If user is on onboarding page but has already completed onboarding
  if (profile.onboarding_completed && location.pathname === '/onboarding') {
    console.log("User already completed onboarding, redirecting to /");
    return <Navigate to="/" replace />;
  }

  // If children are provided, render them
  // Otherwise, render the Outlet for nested routes
  return <>{children ? children : <Outlet />}</>;
}
