
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface AdminBreadcrumbProps {
  items?: BreadcrumbItem[];
}

export function AdminBreadcrumb({ items = [] }: AdminBreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Generate breadcrumb items based on the current path if not provided
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (items.length > 0) return items;
    
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];
    
    // Always add Admin as the first item
    breadcrumbItems.push({
      label: 'Admin',
      path: '/admin'
    });
    
    // Add dynamically generated items
    if (paths.length > 1) {
      let currentPath = '';
      
      for (let i = 1; i < paths.length; i++) {
        currentPath += `/${paths[i]}`;
        const fullPath = `/admin${currentPath}`;
        const label = paths[i].charAt(0).toUpperCase() + paths[i].slice(1).replace(/-/g, ' ');
        
        breadcrumbItems.push({
          label,
          path: fullPath
        });
      }
    }
    
    return breadcrumbItems;
  };
  
  const breadcrumbItems = getBreadcrumbItems();

  return (
    <div className="flex items-center space-x-2 text-sm mb-6">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2"
        onClick={() => navigate('/dashboard')}
      >
        <Home className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </Button>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => navigate(item.path)}
            disabled={index === breadcrumbItems.length - 1}
          >
            {item.label}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}
