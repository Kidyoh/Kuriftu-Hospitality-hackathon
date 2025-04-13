import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'staff' | 'trainee';
  department: string | null;
  position: string | null;
  onboarding_completed: boolean;
  avatar_url: string | null;
  joined_at: string;
}

export default function AdminUserManagement() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filterRole, showInactive]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*');
      
      if (filterRole) {
        query = query.eq('role', filterRole);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setUsers(data as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditedUser({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department,
      position: user.position,
    });
    setDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(editedUser)
        .eq('id', selectedUser.id)
        .select();

      if (error) {
        throw error;
      }

      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, ...editedUser } as User : user
      ));
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user. Please try again.',
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.position && user.position.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'manager': return 'outline';
      case 'staff': return 'secondary';
      case 'trainee': return 'destructive';
      default: return 'outline';
    }
  };

  if (!hasRole(['admin'])) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions in the platform.
          </p>
        </div>

        <Tabs defaultValue="all-users" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all-users">All Users</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="managers">Managers</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="trainees">Trainees</TabsTrigger>
          </TabsList>

          <TabsContent value="all-users" className="space-y-4">
            <UsersList 
              users={filteredUsers} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEditUser={handleEditUser}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <UsersList 
              users={filteredUsers.filter(user => user.role === 'admin')} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEditUser={handleEditUser}
              loading={loading}
            />
          </TabsContent>
          
          <TabsContent value="managers" className="space-y-4">
            <UsersList 
              users={filteredUsers.filter(user => user.role === 'manager')} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEditUser={handleEditUser}
              loading={loading}
            />
          </TabsContent>
          
          <TabsContent value="staff" className="space-y-4">
            <UsersList 
              users={filteredUsers.filter(user => user.role === 'staff')} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEditUser={handleEditUser}
              loading={loading}
            />
          </TabsContent>
          
          <TabsContent value="trainees" className="space-y-4">
            <UsersList 
              users={filteredUsers.filter(user => user.role === 'trainee')} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEditUser={handleEditUser}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={editedUser.first_name || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, first_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={editedUser.last_name || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, last_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select
                  value={editedUser.role}
                  onValueChange={(value: 'admin' | 'manager' | 'staff' | 'trainee') => 
                    setEditedUser({ ...editedUser, role: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="trainee">Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  Department
                </Label>
                <Input
                  id="department"
                  value={editedUser.department || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, department: e.target.value })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">
                  Position
                </Label>
                <Input
                  id="position"
                  value={editedUser.position || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, position: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UsersListProps {
  users: User[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onEditUser: (user: User) => void;
  loading: boolean;
}

function UsersList({ users, searchQuery, setSearchQuery, onEditUser, loading }: UsersListProps) {
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">Export</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        user.role === 'admin' ? 'default' :
                        user.role === 'manager' ? 'outline' :
                        user.role === 'staff' ? 'secondary' :
                        'destructive'
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || '—'}</TableCell>
                    <TableCell>{user.position || '—'}</TableCell>
                    <TableCell>
                      {new Date(user.joined_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEditUser(user)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
} 