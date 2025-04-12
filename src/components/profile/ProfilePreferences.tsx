
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Loader2, BellRing, Moon, Globe } from 'lucide-react';

export function ProfilePreferences() {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    courseUpdates: true,
    newCourses: false,
    achievements: true,
  });
  
  const [appearance, setAppearance] = useState({
    darkMode: false,
    highContrast: false,
    largeText: false,
  });

  const handleSavePreferences = async () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully.",
      });
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
        <CardDescription>Customize your learning experience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BellRing className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Notification Preferences</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="flex-1">
                  <span>Email Notifications</span>
                  <p className="text-sm text-muted-foreground">Receive course updates via email</p>
                </Label>
                <Switch 
                  id="email-notifications" 
                  checked={notifications.email} 
                  onCheckedChange={(checked) => setNotifications({...notifications, email: checked})} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="course-updates" className="flex-1">
                  <span>Course Updates</span>
                  <p className="text-sm text-muted-foreground">Get notified when your courses are updated</p>
                </Label>
                <Switch 
                  id="course-updates" 
                  checked={notifications.courseUpdates} 
                  onCheckedChange={(checked) => setNotifications({...notifications, courseUpdates: checked})} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="new-courses" className="flex-1">
                  <span>New Courses</span>
                  <p className="text-sm text-muted-foreground">Get notified about new courses in your department</p>
                </Label>
                <Switch 
                  id="new-courses" 
                  checked={notifications.newCourses} 
                  onCheckedChange={(checked) => setNotifications({...notifications, newCourses: checked})} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="achievements" className="flex-1">
                  <span>Achievements</span>
                  <p className="text-sm text-muted-foreground">Get notified when you earn new achievements</p>
                </Label>
                <Switch 
                  id="achievements" 
                  checked={notifications.achievements} 
                  onCheckedChange={(checked) => setNotifications({...notifications, achievements: checked})} 
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Moon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Display Preferences</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="flex-1">
                  <span>Dark Mode</span>
                  <p className="text-sm text-muted-foreground">Use dark theme for the interface</p>
                </Label>
                <Switch 
                  id="dark-mode" 
                  checked={appearance.darkMode} 
                  onCheckedChange={(checked) => setAppearance({...appearance, darkMode: checked})} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast" className="flex-1">
                  <span>High Contrast</span>
                  <p className="text-sm text-muted-foreground">Increase contrast for better readability</p>
                </Label>
                <Switch 
                  id="high-contrast" 
                  checked={appearance.highContrast} 
                  onCheckedChange={(checked) => setAppearance({...appearance, highContrast: checked})} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="large-text" className="flex-1">
                  <span>Large Text</span>
                  <p className="text-sm text-muted-foreground">Increase text size throughout the app</p>
                </Label>
                <Switch 
                  id="large-text" 
                  checked={appearance.largeText} 
                  onCheckedChange={(checked) => setAppearance({...appearance, largeText: checked})} 
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Language Settings</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Currently, the application is available in English only. More languages will be supported in future updates.
              </p>
            </div>
          </div>
          
          <Button onClick={handleSavePreferences} className="w-full md:w-auto" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
