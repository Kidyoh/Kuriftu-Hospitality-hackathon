
import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileSecurity } from '@/components/profile/ProfileSecurity';
import { ProfilePreferences } from '@/components/profile/ProfilePreferences';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const { profile, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="bg-destructive/10 p-4 rounded-lg">
            <p className="text-destructive">Unable to load profile. Please try logging in again.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <div className="container py-6 space-y-6">
        <ProfileHeader profile={profile} />
        
        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="pt-4">
            <ProfileForm profile={profile} />
          </TabsContent>
          
          <TabsContent value="security" className="pt-4">
            <ProfileSecurity />
          </TabsContent>
          
          <TabsContent value="preferences" className="pt-4">
            <ProfilePreferences />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
