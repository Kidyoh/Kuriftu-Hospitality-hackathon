import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, GraduationCap, BarChart2, 
  Trophy, Users, FileText,
  Home, Settings, HelpCircle,
  Briefcase, User, LineChart,
  CalendarDays, MessageSquare, Coffee,
  ShieldAlert,
  BadgeInfo,
  Calendar,
  Clock,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  LibrarySquare,
  PersonStanding,
  PieChart,
  Video,
  Youtube
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
  const { profile, hasRole, user } = useAuth();
  const path = location.pathname;
  
  // Helper to check if a path is active, supporting both exact matches and partial matches for nested routes
  const isActive = (currentPath: string, targetPath: string, exact: boolean = false) => {
    if (exact) return currentPath === targetPath;
    return currentPath === targetPath || (currentPath.startsWith(targetPath) && targetPath !== '/');
  };
  
  // Define role-based flags
  const isAdmin = hasRole(['admin']);
  const isManager = hasRole(['admin', 'manager']);
  const isStaff = hasRole(['staff']);
  const isTrainee = hasRole(['trainee']);
  const isNormalUser = isStaff || isTrainee;

  // If user is authenticated but profile is not loaded yet, show basic navigation
  if (user && !profile) {
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
                active={path === '/dashboard'} 
              />
              <SidebarItem 
                icon={BookOpen} 
                label="Courses" 
                href="/courses" 
                active={isActive(path, '/courses', false) && !path.startsWith('/admin')} 
              />
              {/* <SidebarItem 
                icon={GraduationCap} 
                label="My Learning" 
                href="/my-learning" 
                active={isActive(path, '/my-learning', false)} 
              /> */}
              <SidebarItem 
                icon={BarChart2} 
                label="My Achievements" 
                href="/achievements" 
                active={isActive(path, '/achievements', true)} 
              />
              <SidebarItem 
                icon={User} 
                label="Profile" 
                href="/profile" 
                active={path === '/profile'} 
              />
              {/* <SidebarItem 
                icon={HelpCircle} 
                label="Help & Support" 
                href="/support" 
                active={path === '/support'} 
              /> */}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If no user is authenticated, show a limited sidebar
  if (!user) {
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
                label="Home" 
                href="/" 
                active={path === '/'} 
              />
              <SidebarItem 
                icon={User} 
                label="Login" 
                href="/auth" 
                active={path === '/auth'} 
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
              {/* <SidebarItem 
                icon={Settings} 
                label="System Settings" 
                href="/admin/settings" 
                active={isActive(path, '/admin/settings')} 
              /> */}
              <SidebarItem 
                icon={Youtube} 
                label="YouTube Settings" 
                href="/admin/youtube-settings" 
                active={isActive(path, '/admin/youtube-settings')} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // For regular routes, show role-based navigation
  return (
    <div className={cn("pb-12 w-64 border-r", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight text-kuriftu-brown">
            Learning Village
          </h2>
          
          {/* Only show learner dashboard to normal users */}
          {isNormalUser && (
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
                label="My Achievements" 
                href="/achievements" 
                active={isActive(path, '/achievements', true)} 
              />
              {/* <SidebarItem 
                icon={BarChart2} 
                label="My Progress" 
                href="/progress" 
                active={isActive(path, '/progress', true)} 
              /> */}
            </div>
          )}
          
          {/* Show manager-specific navigation */}
          {isManager && !isAdmin && (
            <div className="space-y-1">
              <SidebarItem 
                icon={Home} 
                label="Manager Dashboard" 
                href="/dashboard" 
                active={path === '/dashboard' || path === '/'} 
              />
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
              <SidebarItem 
                icon={CalendarDays} 
                label="Schedule" 
                href="/schedule" 
                active={isActive(path, '/schedule', true)} 
              />
            </div>
          )}
          
          {/* Show admin-specific navigation when on regular pages */}
          {isAdmin && (
            <div className="space-y-1">
              <SidebarItem 
                icon={ShieldAlert} 
                label="Admin Dashboard" 
                href="/admin" 
                active={path === '/admin'} 
              />
              <SidebarItem 
                icon={Users} 
                label="User Management" 
                href="/admin/users" 
                active={isActive(path, '/admin/users', true)} 
              />
              <SidebarItem 
                icon={BookOpen} 
                label="Course Management" 
                href="/admin/courses" 
                active={isActive(path, '/admin/courses', false)} 
              />
              <SidebarItem 
                icon={LineChart} 
                label="Analytics" 
                href="/admin/analytics" 
                active={isActive(path, '/admin/analytics', false)} 
              />
            </div>
          )}
        </div>
        
        {/* Staff-specific section */}
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
        
        {/* Common settings section for all users */}
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-kuriftu-brown">
            Account
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              icon={User} 
              label="Profile" 
              href="/profile" 
              active={isActive(path, '/profile', true)} 
            />
            {/* <SidebarItem 
              icon={Settings} 
              label="Settings" 
              href="/settings" 
              active={isActive(path, '/settings', true)} 
            /> */}
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
