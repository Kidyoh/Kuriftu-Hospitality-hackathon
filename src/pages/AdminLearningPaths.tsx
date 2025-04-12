
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, UserCheck, Search, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface UserLearningPath {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  under_review: boolean;
  admin_approved: boolean;
  ai_generated: boolean;
  user_details?: {
    first_name: string;
    last_name: string;
    department: string;
    position: string;
  };
}

export default function AdminLearningPaths() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [userLearningPaths, setUserLearningPaths] = useState<UserLearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');
  const [viewPath, setViewPath] = useState<UserLearningPath | null>(null);

  useEffect(() => {
    if (profile && profile.role === 'admin') {
      fetchUserLearningPaths();
    }
  }, [profile]);

  const fetchUserLearningPaths = async () => {
    setIsLoading(true);
    try {
      // Fix the join query by explicitly specifying the join column
      const { data, error } = await supabase
        .from('user_learning_paths')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            department,
            position
          )
        `);

      if (error) {
        console.error('Error fetching learning paths:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load learning paths. Please try again.",
        });
        return;
      }

      // Transform the data with proper type handling
      const transformedData = data.map(item => {
        // Make sure profiles is treated as the correct type or provide defaults
        const profiles = item.profiles as any;
        return {
          ...item,
          user_details: profiles ? {
            first_name: profiles.first_name || '',
            last_name: profiles.last_name || '',
            department: profiles.department || '',
            position: profiles.position || ''
          } : {
            first_name: '',
            last_name: '',
            department: '',
            position: ''
          }
        };
      });

      setUserLearningPaths(transformedData);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approveLearningPath = async (pathId: string) => {
    try {
      const { error } = await supabase
        .from('user_learning_paths')
        .update({
          under_review: false,
          admin_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: profile?.id
        })
        .eq('id', pathId);

      if (error) {
        console.error('Error approving learning path:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to approve learning path."
        });
        return;
      }

      toast({
        title: "Success",
        description: "Learning path has been approved."
      });

      fetchUserLearningPaths();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
    }
  };

  const rejectLearningPath = async (pathId: string) => {
    try {
      const { error } = await supabase
        .from('user_learning_paths')
        .delete()
        .eq('id', pathId);

      if (error) {
        console.error('Error rejecting learning path:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to reject learning path."
        });
        return;
      }

      toast({
        title: "Success",
        description: "Learning path has been rejected."
      });

      fetchUserLearningPaths();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
    }
  };

  const filteredPaths = userLearningPaths.filter(path => {
    const matchesSearch = 
      path.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.user_details?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.user_details?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.user_details?.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === 'pending') {
      return matchesSearch && path.under_review;
    } else if (selectedTab === 'approved') {
      return matchesSearch && path.admin_approved;
    }
    
    return matchesSearch;
  });

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Learning Path Management</h1>
          <p className="text-muted-foreground">Review and manage user learning paths</p>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All Paths</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : filteredPaths.length > 0 ? (
            filteredPaths.map(path => (
              <Card key={path.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{path.name}</CardTitle>
                      <CardDescription>
                        Created for: {path.user_details?.first_name} {path.user_details?.last_name} • 
                        Department: {path.user_details?.department || 'Not specified'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={path.ai_generated ? "secondary" : "outline"}>
                        {path.ai_generated ? "AI Generated" : "Custom"}
                      </Badge>
                      <Badge variant={path.under_review ? "outline" : "default"}>
                        {path.under_review ? "Under Review" : "Approved"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => setViewPath(path)}>View Details</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{path.name}</DialogTitle>
                          <DialogDescription>
                            Created for: {path.user_details?.first_name} {path.user_details?.last_name} • 
                            Position: {path.user_details?.position || 'Not specified'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium">Description</h3>
                            <p>{path.description}</p>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">Courses</h3>
                            <p className="text-muted-foreground">
                              The list of courses would appear here, but we need to fetch the associated courses.
                            </p>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => rejectLearningPath(path.id)}>
                              Reject Path
                            </Button>
                            <Button onClick={() => approveLearningPath(path.id)}>
                              Approve Path
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" onClick={() => rejectLearningPath(path.id)}>Reject</Button>
                    <Button onClick={() => approveLearningPath(path.id)}>Approve</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No Pending Learning Paths</h3>
                <p className="text-center text-muted-foreground max-w-md mt-2">
                  There are no learning paths waiting for your review at the moment.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {/* Similar structure as above but for approved paths */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : filteredPaths.length > 0 ? (
            filteredPaths.map(path => (
              <Card key={path.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{path.name}</CardTitle>
                      <CardDescription>
                        Created for: {path.user_details?.first_name} {path.user_details?.last_name} • 
                        Department: {path.user_details?.department || 'Not specified'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={path.ai_generated ? "secondary" : "outline"}>
                        {path.ai_generated ? "AI Generated" : "Custom"}
                      </Badge>
                      <Badge variant="secondary">
                        Approved
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                  <div className="flex justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => setViewPath(path)}>View Details</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{path.name}</DialogTitle>
                          <DialogDescription>
                            Created for: {path.user_details?.first_name} {path.user_details?.last_name} • 
                            Position: {path.user_details?.position || 'Not specified'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium">Description</h3>
                            <p>{path.description}</p>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">Courses</h3>
                            <p className="text-muted-foreground">
                              The list of courses would appear here, but we need to fetch the associated courses.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No Approved Learning Paths</h3>
                <p className="text-center text-muted-foreground max-w-md mt-2">
                  There are no approved learning paths yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {/* Similar structure for all paths */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : filteredPaths.length > 0 ? (
            filteredPaths.map(path => (
              <Card key={path.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{path.name}</CardTitle>
                      <CardDescription>
                        Created for: {path.user_details?.first_name} {path.user_details?.last_name} • 
                        Department: {path.user_details?.department || 'Not specified'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={path.ai_generated ? "secondary" : "outline"}>
                        {path.ai_generated ? "AI Generated" : "Custom"}
                      </Badge>
                      <Badge variant={path.under_review ? "outline" : "default"}>
                        {path.under_review ? "Under Review" : "Approved"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => setViewPath(path)}>View Details</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{path.name}</DialogTitle>
                          <DialogDescription>
                            Created for: {path.user_details?.first_name} {path.user_details?.last_name} • 
                            Position: {path.user_details?.position || 'Not specified'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium">Description</h3>
                            <p>{path.description}</p>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">Courses</h3>
                            <p className="text-muted-foreground">
                              The list of courses would appear here, but we need to fetch the associated courses.
                            </p>
                          </div>
                          {path.under_review && (
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" onClick={() => rejectLearningPath(path.id)}>
                                Reject Path
                              </Button>
                              <Button onClick={() => approveLearningPath(path.id)}>
                                Approve Path
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    {path.under_review && (
                      <>
                        <Button variant="destructive" onClick={() => rejectLearningPath(path.id)}>Reject</Button>
                        <Button onClick={() => approveLearningPath(path.id)}>Approve</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No Learning Paths</h3>
                <p className="text-center text-muted-foreground max-w-md mt-2">
                  There are no learning paths created yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

