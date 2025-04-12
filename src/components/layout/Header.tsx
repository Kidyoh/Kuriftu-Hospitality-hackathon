import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, UserCircle, Settings, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/language/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Badge } from "../ui/badge";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, profile, signOut, hasRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Default title using translation
  const defaultTitle = t('app.title');
  
  const getInitials = () => {
    if (!profile) return '';
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  };

  // Use the new hasRole function from AuthContext
  const isAdmin = profile && hasRole(['admin']);
  const isManager = profile && hasRole(['admin', 'manager']);

  // Role-specific color for the avatar border
  const getAvatarBorderClass = () => {
    if (!profile) return "";
    
    switch(profile.role) {
      case 'admin':
        return "ring-2 ring-kuriftu-brown";
      case 'manager':
        return "ring-2 ring-kuriftu-green";
      case 'staff':
        return "ring-2 ring-kuriftu-orange";
      default:
        return "ring-2 ring-kuriftu-cream";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <span className="font-bold text-xl text-primary">
              {title || defaultTitle}
            </span>
          </Link>
        </div>
        
        {user && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-2 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        )}
        
        <div className="flex-1" />
        
        {user ? (
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Role badge */}
            {profile && (
              <Badge 
                variant="outline" 
                className={`hidden sm:inline-flex capitalize ${
                  profile.role === 'admin' 
                    ? 'bg-kuriftu-brown text-white' 
                    : profile.role === 'manager'
                    ? 'bg-kuriftu-green text-white'
                    : profile.role === 'staff'
                    ? 'bg-kuriftu-orange text-white'
                    : 'bg-kuriftu-cream text-kuriftu-brown'
                }`}
              >
                {profile.role}
              </Badge>
            )}
            
            {/* Admin quick access */}
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin')} 
                className="mr-2 hidden sm:flex items-center gap-1 border-kuriftu-brown text-kuriftu-brown hover:bg-kuriftu-brown/10"
              >
                <ShieldAlert className="h-4 w-4" />
                {t('nav.dashboard')}
              </Button>
            )}
            
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
            
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className={`cursor-pointer ${getAvatarBorderClass()}`}>
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className={
                    profile?.role === 'admin' 
                      ? 'bg-kuriftu-brown/20' 
                      : profile?.role === 'manager'
                      ? 'bg-kuriftu-green/20'
                      : profile?.role === 'staff'
                      ? 'bg-kuriftu-orange/20'
                      : 'bg-kuriftu-cream/50'
                  }>{getInitials()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {profile ? `${profile.first_name} ${profile.last_name}` : t('auth.account')}
                  {profile && (
                    <span className="block text-xs text-muted-foreground capitalize">{profile.role}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <UserCircle className="h-4 w-4 mr-2" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('app.settings')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        {t('nav.admin')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                            {t('nav.dashboard')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/admin?tab=users')} className="cursor-pointer">
                            {t('nav.users')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/admin?tab=paths')} className="cursor-pointer">
                            {t('nav.learning')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/admin?tab=settings')} className="cursor-pointer">
                            {t('app.settings')}
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex gap-2">
            <LanguageSwitcher />
            <Link to="/auth">
              <Button variant="outline">{t('auth.login')}</Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button>{t('auth.register')}</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
