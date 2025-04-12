
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, GraduationCap, BarChart2, 
  Trophy, Users, FileText,
  Home, Settings, HelpCircle,
  Briefcase, User, LineChart,
  CalendarDays, MessageSquare, Coffee
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
  const { profile } = useAuth();
  const path = location.pathname;
  
  // If profile is not loaded yet, show a limited sidebar
  if (!profile) {
    return (
      <div className={cn("pb-12", className)}>
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
  
  const role = profile.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  const isStaff = role === 'staff' || isManager;
  
  return (
    <div className={cn("pb-12", className)}>
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
              icon={BookOpen} 
              label="Courses" 
              href="/courses" 
              active={path === '/courses'} 
            />
            <SidebarItem 
              icon={GraduationCap} 
              label="My Learning" 
              href="/my-learning" 
              active={path === '/my-learning'} 
            />
            <SidebarItem 
              icon={BarChart2} 
              label="My Progress" 
              href="/progress" 
              active={path === '/progress'} 
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
                active={path === '/schedule'} 
              />
              <SidebarItem 
                icon={MessageSquare} 
                label="Team Chat" 
                href="/chat" 
                active={path === '/chat'} 
              />
              <SidebarItem 
                icon={Coffee} 
                label="Break Room" 
                href="/break-room" 
                active={path === '/break-room'} 
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
                active={path === '/team'} 
              />
              <SidebarItem 
                icon={LineChart} 
                label="Analytics" 
                href="/analytics" 
                active={path === '/analytics'} 
              />
              {isAdmin && (
                <SidebarItem 
                  icon={Briefcase} 
                  label="Administration" 
                  href="/admin" 
                  active={path.startsWith('/admin')} 
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
              active={path === '/achievements'} 
            />
            <SidebarItem 
              icon={FileText} 
              label="Resources" 
              href="/resources" 
              active={path === '/resources'} 
            />
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="space-y-1">
            <SidebarItem 
              icon={User} 
              label="Profile" 
              href="/profile" 
              active={path === '/profile'} 
            />
            <SidebarItem 
              icon={Settings} 
              label="Settings" 
              href="/settings" 
              active={path === '/settings'} 
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
