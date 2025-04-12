
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
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const location = useLocation();

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

  // If profile is not loaded, show limited functionality message but continue
  if (!profile) {
    console.log("Profile not loaded, allowing access but with limited functionality");
    
    // Auto-refresh profile after a delay (only once)
    React.useEffect(() => {
      const timer = setTimeout(() => {
        refreshProfile();
      }, 3000);
      
      return () => clearTimeout(timer);
    }, []);
    
    // Allow access to onboarding even without profile
    if (location.pathname === '/onboarding') {
      return <>{children ? children : <Outlet />}</>;
    }
    
    // For profile page, allow access so user can potentially fix their profile
    if (location.pathname === '/profile') {
      return <>{children ? children : <Outlet />}</>;
    }
    
    // For other pages, show profile loading state
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-kuriftu-green mb-4" />
        <h2 className="text-xl font-bold mb-2">Loading Profile Data</h2>
        <p className="text-center text-muted-foreground mb-4">
          Your profile data is still loading. Some features may be limited until your profile loads.
        </p>
        <button
          onClick={() => refreshProfile()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry Loading Profile
        </button>
      </div>
    );
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
