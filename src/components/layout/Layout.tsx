
import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-64 flex-col border-r bg-background">
          <Sidebar />
        </aside>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
