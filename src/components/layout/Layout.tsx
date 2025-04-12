
import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();
  
  // Determine background color based on user role
  const getBgColor = () => {
    if (!profile) return "bg-background";
    
    switch(profile.role) {
      case 'admin':
        return "bg-background border-l-4 border-kuriftu-brown";
      case 'manager':
        return "bg-background border-l-4 border-kuriftu-green";
      case 'staff':
        return "bg-background border-l-4 border-kuriftu-orange";
      default:
        return "bg-background border-l-4 border-kuriftu-cream";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-64 flex-col border-r bg-background">
          <Sidebar />
        </aside>
        <main className={`flex-1 flex flex-col ${getBgColor()}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
