
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'staff' | 'trainee';
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  phone: string | null;
  experience_level: string | null;
  joined_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roles: Array<'admin' | 'manager' | 'staff' | 'trainee'>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST to prevent recursion issues
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Use setTimeout to prevent potential recursion
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsLoading(false);
          setProfileLoadAttempted(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Set loading state
      setIsLoading(true);
      
      // Log the attempt to load profile
      console.log(`Attempting to load profile for user: ${userId}`);

      // Try to fetch profile with direct query
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Always mark that we've attempted to load the profile
      setProfileLoadAttempted(true);

      if (error) {
        console.error('Error fetching user profile:', error);
        // For profile not found or other errors, create a default profile
        await createProfileDirectly(userId);
        return;
      }

      if (!data) {
        console.log('No profile found, creating initial profile');
        return await createProfileDirectly(userId);
      }

      console.log('Fetched user profile:', data);
      setProfile(data as UserProfile);
      setIsLoading(false);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      await createFallbackProfile(userId);
      setIsLoading(false);
    }
  };

  // Direct approach for profile creation - simpler and less prone to errors
  const createProfileDirectly = async (userId: string) => {
    try {
      if (!user) {
        createFallbackProfile(userId);
        return;
      }
      
      const metadata = user.user_metadata || {};
      
      // Create a minimal profile with only required fields
      const profileData = {
        id: userId,
        first_name: metadata.first_name || '',
        last_name: metadata.last_name || '',
        role: 'trainee' as const,
        onboarding_completed: false,
        joined_at: new Date().toISOString(),
      };
      
      console.log("Creating default profile with data:", profileData);
      
      try {
        // Try a direct insert with upsert
        const { data, error } = await supabase
          .from('profiles')
          .upsert(profileData)
          .select();
        
        if (error) {
          console.error('Error in profile fallback method:', error);
          // If we still can't create a profile, create a temporary local one
          createFallbackProfile(userId);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('Profile created successfully:', data[0]);
          setProfile(data[0] as UserProfile);
          setIsLoading(false);
        } else {
          console.log('No profile data returned after upsert');
          createFallbackProfile(userId);
        }
      } catch (innerErr) {
        console.error('Inner try-catch for profile creation caught error:', innerErr);
        // Create an in-memory profile as last resort
        createFallbackProfile(userId);
      }
    } catch (err) {
      console.error('Unexpected error creating profile:', err);
      createFallbackProfile(userId);
    }
  };
  
  // Create a fallback profile in memory when database operations fail
  const createFallbackProfile = (userId: string) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const metadata = user.user_metadata || {};
    const tempProfile: UserProfile = {
      id: userId,
      first_name: metadata.first_name || '',
      last_name: metadata.last_name || '',
      role: 'trainee',
      department: null,
      position: null,
      avatar_url: null,
      phone: null,
      experience_level: null,
      onboarding_completed: false,
      joined_at: new Date().toISOString(),
    };
    
    console.log('Created temporary in-memory profile:', tempProfile);
    setProfile(tempProfile);
    setIsLoading(false);
    
    // Show a warning to the user
    toast({
      variant: "warning",
      title: "Limited functionality mode",
      description: "We're having trouble connecting to the database. Some features may be limited.",
    });
  };

  const hasRole = (roles: Array<'admin' | 'manager' | 'staff' | 'trainee'>): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const refreshProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    await fetchUserProfile(user.id);
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
      }
      return { error };
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: err.message || "An unexpected error occurred",
      });
      return { error: err };
    } finally {
      // Don't set isLoading to false here as the onAuthStateChange will handle that
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Registration successful",
          description: "Your account has been created. Complete the onboarding to get started.",
        });
      }
      return { error };
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err.message || "An unexpected error occurred",
      });
      return { error: err };
    } finally {
      // Don't set isLoading to false here as the onAuthStateChange will handle that
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setProfile(null);
      navigate('/auth');
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: err.message || "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session,
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
