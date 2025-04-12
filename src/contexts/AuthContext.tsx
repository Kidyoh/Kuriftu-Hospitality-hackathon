
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
  const [profileAttempts, setProfileAttempts] = useState(0);
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
      // Increase profile fetch attempts
      setProfileAttempts(prev => prev + 1);
      
      // Try direct query approach to avoid RLS issues
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();  // Use maybeSingle instead of single to handle not found case

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createInitialProfile(userId);
        } else {
          // For other errors, especially if we have recursion errors, we'll fallback to a simplified approach
          await createOrUpdateProfileWithFallback(userId);
        }
        return;
      }

      if (!data) {
        console.log('No profile found, creating initial profile');
        await createInitialProfile(userId);
        return;
      }

      console.log('Fetched user profile:', data);
      setProfile(data as UserProfile);
      setProfileAttempts(0); // Reset attempts on success
      setIsLoading(false);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setIsLoading(false);
      
      // Try again with a delay if we've had less than 3 attempts
      if (profileAttempts < 3) {
        setTimeout(() => fetchUserProfile(userId), 1000);
      }
    }
  };

  // Fallback approach using direct insert to bypass RLS issues
  const createOrUpdateProfileWithFallback = async (userId: string) => {
    try {
      // Try to get user metadata directly from the session
      const metadata = user?.user_metadata;
      
      const firstName = metadata?.first_name || '';
      const lastName = metadata?.last_name || '';
      
      // Use direct insert/upsert approach instead of RPC
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          role: 'trainee',
          onboarding_completed: false,
          joined_at: new Date().toISOString()
        })
        .select('*')
        .maybeSingle();
      
      if (error) {
        console.error('Error in profile fallback method:', error);
        toast({
          variant: "destructive",
          title: "Error creating profile",
          description: "Please try refreshing the page or contact support.",
        });
        setIsLoading(false);
        return;
      }
      
      if (data) {
        console.log('Profile created/updated using fallback method:', data);
        setProfile(data as UserProfile);
        setProfileAttempts(0);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Unexpected error in fallback profile creation:', err);
      setIsLoading(false);
    }
  };

  const createInitialProfile = async (userId: string) => {
    try {
      // Try to get user metadata directly from the session
      const metadata = user?.user_metadata;
      
      const firstName = metadata?.first_name || '';
      const lastName = metadata?.last_name || '';
      
      // Use upsert to handle both create and update scenarios
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          role: 'trainee',
          onboarding_completed: false,
          joined_at: new Date().toISOString()
        })
        .select('*')
        .maybeSingle();
      
      if (error) {
        console.error('Error creating initial profile:', error);
        
        // If we still have issues, try the fallback approach
        if (error.code === '42P17') {
          await createOrUpdateProfileWithFallback(userId);
          return;
        }
        
        toast({
          variant: "destructive",
          title: "Error creating profile",
          description: "Please try refreshing the page or contact support.",
        });
      } else if (data) {
        console.log('Initial profile created:', data);
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Unexpected error creating initial profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (roles: Array<'admin' | 'manager' | 'staff' | 'trainee'>): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const refreshProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    setProfileAttempts(0); // Reset attempts counter
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
