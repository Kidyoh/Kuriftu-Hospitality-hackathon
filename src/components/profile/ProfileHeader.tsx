
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Briefcase } from 'lucide-react';

interface ProfileProps {
  profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    department: string | null;
    position: string | null;
    experience_level: string | null;
    role: string;
    joined_at: string;
  };
}

export function ProfileHeader({ profile }: ProfileProps) {
  const getInitials = () => {
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return 'Unknown date';
    }
  };

  const getRoleBadgeColor = () => {
    switch (profile.role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-32 md:h-40 bg-primary/10" />
      <CardContent className="relative pt-0">
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
          </Avatar>
          
          <div className="space-y-1 flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
              <h2 className="text-2xl font-semibold">{profile.first_name} {profile.last_name}</h2>
              <Badge className={`${getRoleBadgeColor()} capitalize`}>{profile.role}</Badge>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 text-sm text-muted-foreground">
              {profile.position && profile.department && (
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  <span>{profile.position} - {profile.department}</span>
                </div>
              )}
              
              {profile.experience_level && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.experience_level} level</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>Joined {formatDate(profile.joined_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
