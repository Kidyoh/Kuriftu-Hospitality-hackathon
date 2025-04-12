
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, GraduationCap, BarChart2, 
  Trophy, Users, FileText, ChevronsRight,
  Home, Settings, HelpCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
          active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
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
  // Get current path for active state
  const path = window.location.pathname;
  
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight">
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
              label="Progress" 
              href="/progress" 
              active={path === '/progress'} 
            />
          </div>
        </div>
        
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
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
              icon={Users} 
              label="Mentorship" 
              href="/mentorship" 
              active={path === '/mentorship'} 
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
