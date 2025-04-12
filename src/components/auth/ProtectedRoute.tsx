import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

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
  const { user, profile, isLoading, refreshProfile, hasRole } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute - Path:", location.pathname, "User:", !!user, "Profile:", !!profile);

  // While we're loading auth state, show a nice loading indicator
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-kuriftu-brown" />
        <span className="ml-2 text-lg">Loading authentication...</span>
      </div>
    );
  }
  
  // If not logged in, redirect to auth page
  if (!user) {
    console.log("No user found, redirecting to /auth");
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Special handling for onboarding route
  // Always allow access to onboarding route even without a profile
  if (location.pathname === '/onboarding') {
    // If profile exists and onboarding is completed, redirect to dashboard
    if (profile && profile.onboarding_completed) {
      console.log("User already completed onboarding, redirecting to /");
      return <Navigate to="/" replace />;
    }
    
    // Otherwise allow access to the onboarding page
    return <>{children ? children : <Outlet />}</>;
  }

  // For profile page, always allow access
  if (location.pathname === '/profile') {
    return <>{children ? children : <Outlet />}</>;
  }

  // If profile is not loaded, show limited access message with retry option
  if (!profile) {
    console.log("Profile not loaded, showing retry option");
    
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-kuriftu-green mb-4" />
        <h2 className="text-xl font-bold mb-2">Loading Profile Data</h2>
        <p className="text-center text-muted-foreground mb-4">
          We're having trouble loading your profile data. Please try again or go to onboarding.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => refreshProfile()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry Loading Profile
          </Button>
          
          <Button
            onClick={() => window.location.href = "/onboarding"}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            Go to Onboarding
          </Button>
        </div>
      </div>
    );
  }

  // If this route has role requirements, check them
  if (requiredRoles.length > 0) {
    // Use the hasRole function from AuthContext
    if (!hasRole(requiredRoles)) {
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

  // If a user hasn't completed onboarding and requireOnboarding is true, redirect to onboarding
  if (requireOnboarding && !profile.onboarding_completed && 
      location.pathname !== '/profile' && location.pathname !== '/auth') {
    console.log("User hasn't completed onboarding, redirecting to /onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  // If children are provided, render them
  // Otherwise, render the Outlet for nested routes
  return <>{children ? children : <Outlet />}</>;
}
