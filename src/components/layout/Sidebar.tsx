
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, GraduationCap, BarChart2, 
  Trophy, Users, FileText,
  Home, Settings, HelpCircle,
  Briefcase, User, LineChart,
  CalendarDays, MessageSquare, Coffee,
  ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

export function SidebarItem({ icon: Icon, label, href, active }: SidebarItemProps) {
  return (
    <Link to={href} className="w-full">
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          active ? "bg-kuriftu-cream text-kuriftu-brown" : "text-muted-foreground hover:bg-muted"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Button>
    </Link>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { profile, hasRole } = useAuth();
  const path = location.pathname;
  
  // Helper to check if a path is active, supporting both exact matches and partial matches for nested routes
  const isActive = (currentPath: string, targetPath: string, exact: boolean = false) => {
    if (exact) return currentPath === targetPath;
    return currentPath === targetPath || (currentPath.startsWith(targetPath) && targetPath !== '/');
  };
  
  // If profile is not loaded yet, show a limited sidebar
  if (!profile) {
    return (
      <div className={cn("pb-12 w-64 border-r", className)}>
        <div className="space-y-4 py-4">
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight text-kuriftu-brown">
              Learning Village
            </h2>
            <div className="space-y-1">
              <SidebarItem 
                icon={Home} 
                label="Dashboard" 
                href="/" 
                active={path === '/'} 
              />
              <SidebarItem 
                icon={User} 
                label="Profile" 
                href="/profile" 
                active={path === '/profile'} 
              />
              <SidebarItem 
                icon={HelpCircle} 
                label="Help & Support" 
                href="/support" 
                active={path === '/support'} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Check for admin path to show admin sidebar
  const isAdminPath = path.startsWith('/admin');
  
  // Check for roles using the hasRole function
  const isAdmin = hasRole(['admin']);
  const isManager = hasRole(['admin', 'manager']);
  const isStaff = hasRole(['admin', 'manager', 'staff']);
  
  // For admin routes, show a specific admin sidebar
  if (isAdminPath) {
    return (
      <div className={cn("pb-12 w-64 border-r", className)}>
        <div className="space-y-4 py-4">
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight text-kuriftu-brown">
              Admin Console
            </h2>
            <div className="space-y-1">
              <SidebarItem 
                icon={ShieldAlert} 
                label="Admin Dashboard" 
                href="/admin" 
                active={path === '/admin'} 
              />
              <SidebarItem 
                icon={BookOpen} 
                label="Course Management" 
                href="/admin/courses" 
                active={isActive(path, '/admin/courses')} 
              />
              <SidebarItem 
                icon={GraduationCap} 
                label="Learning Paths" 
                href="/admin/learning-paths" 
                active={isActive(path, '/admin/learning-paths')} 
              />
              <SidebarItem 
                icon={Users} 
                label="User Management" 
                href="/admin/users" 
                active={isActive(path, '/admin/users')} 
              />
              <SidebarItem 
                icon={BarChart2} 
                label="Analytics" 
                href="/admin/analytics" 
                active={isActive(path, '/admin/analytics')} 
              />
              <SidebarItem 
                icon={Settings} 
                label="System Settings" 
                href="/admin/settings" 
                active={isActive(path, '/admin/settings')} 
              />
            </div>
          </div>
          <div className="px-4 py-2">
            <SidebarItem 
              icon={Home} 
              label="Back to Dashboard" 
              href="/dashboard" 
              active={false} 
            />
          </div>
        </div>
      </div>
    );
  }
  
  // For regular routes, show the appropriate sidebar based on user role
  return (
    <div className={cn("pb-12 w-64 border-r", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight text-kuriftu-brown">
            Learning Village
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              icon={Home} 
              label="Dashboard" 
              href="/dashboard" 
              active={path === '/dashboard' || path === '/'} 
            />
            <SidebarItem 
              icon={BookOpen} 
              label="Courses" 
              href="/courses" 
              active={isActive(path, '/courses', false) && !path.startsWith('/admin')} 
            />
            <SidebarItem 
              icon={GraduationCap} 
              label="My Learning" 
              href="/my-learning" 
              active={isActive(path, '/my-learning', false)} 
            />
            <SidebarItem 
              icon={BarChart2} 
              label="My Progress" 
              href="/progress" 
              active={isActive(path, '/progress', true)} 
            />
          </div>
        </div>
        
        {isStaff && (
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-kuriftu-brown">
              Staff
            </h2>
            <div className="space-y-1">
              <SidebarItem 
                icon={CalendarDays} 
                label="Schedule" 
                href="/schedule" 
                active={isActive(path, '/schedule', true)} 
              />
              <SidebarItem 
                icon={MessageSquare} 
                label="Team Chat" 
                href="/chat" 
                active={isActive(path, '/chat', true)} 
              />
              <SidebarItem 
                icon={Coffee} 
                label="Break Room" 
                href="/break-room" 
                active={isActive(path, '/break-room', true)} 
              />
            </div>
          </div>
        )}
        
        {isManager && (
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-kuriftu-brown">
              Management
            </h2>
            <div className="space-y-1">
              <SidebarItem 
                icon={Users} 
                label="Team Members" 
                href="/team" 
                active={isActive(path, '/team', true)} 
              />
              <SidebarItem 
                icon={LineChart} 
                label="Analytics" 
                href="/analytics" 
                active={isActive(path, '/analytics', true)} 
              />
              {isAdmin && (
                <SidebarItem 
                  icon={ShieldAlert} 
                  label="Admin Console" 
                  href="/admin" 
                  active={false} 
                />
              )}
            </div>
          </div>
        )}
        
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-kuriftu-brown">
            Community
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              icon={Trophy} 
              label="Achievements" 
              href="/achievements" 
              active={isActive(path, '/achievements', true)} 
            />
            <SidebarItem 
              icon={FileText} 
              label="Resources" 
              href="/resources" 
              active={isActive(path, '/resources', true)} 
            />
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="space-y-1">
            <SidebarItem 
              icon={User} 
              label="Profile" 
              href="/profile" 
              active={isActive(path, '/profile', true)} 
            />
            <SidebarItem 
              icon={Settings} 
              label="Settings" 
              href="/settings" 
              active={isActive(path, '/settings', true)} 
            />
            <SidebarItem 
              icon={HelpCircle} 
              label="Help & Support" 
              href="/support" 
              active={isActive(path, '/support', true)} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
