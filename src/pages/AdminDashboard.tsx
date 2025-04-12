
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PlusCircle, UserIcon, BookOpen, BarChart, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  estimated_hours: number;
  created_at: string;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  department: string;
  role: string;
  created_at: string;
}

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  position: string | null;
  onboarding_completed: boolean;
}

// Form validation schemas
const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  difficulty_level: z.string().min(1, "Difficulty level is required"),
  estimated_hours: z.coerce.number().min(1, "Estimated hours must be at least 1")
});

const pathSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required")
});

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isAddingPath, setIsAddingPath] = useState(false);
  
  // Form for adding courses
  const courseForm = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      difficulty_level: "beginner",
      estimated_hours: 1
    }
  });

  // Form for adding learning paths
  const pathForm = useForm<z.infer<typeof pathSchema>>({
    resolver: zodResolver(pathSchema),
    defaultValues: {
      name: "",
      description: "",
      department: "",
      role: "trainee"
    }
  });

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setIsLoading(true);
    try {
      if (tab === "courses") {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setCourses(data || []);
      } 
      else if (tab === "paths") {
        const { data, error } = await supabase
          .from('learning_paths')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setLearningPaths(data || []);
      }
      else if (tab === "users") {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, department, position, onboarding_completed');
          
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch data: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCourse = async (values: z.infer<typeof courseSchema>) => {
    try {
      const { error } = await supabase
        .from('courses')
        .insert([values]);
        
      if (error) throw error;
      
      toast({
        title: "Course added",
        description: "The course has been added successfully"
      });
      
      setIsAddingCourse(false);
      courseForm.reset();
      fetchData("courses");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add course: ${error.message}`
      });
    }
  };

  const handleAddPath = async (values: z.infer<typeof pathSchema>) => {
    try {
      const { error } = await supabase
        .from('learning_paths')
        .insert([values]);
        
      if (error) throw error;
      
      toast({
        title: "Learning path added",
        description: "The learning path has been added successfully"
      });
      
      setIsAddingPath(false);
      pathForm.reset();
      fetchData("paths");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add learning path: ${error.message}`
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header title="Admin Dashboard" />
        <main className="container py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <div className="mt-4 md:mt-0">
              {activeTab === "courses" && (
                <Dialog open={isAddingCourse} onOpenChange={setIsAddingCourse}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Course</DialogTitle>
                      <DialogDescription>
                        Create a new training course for employees
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...courseForm}>
                      <form onSubmit={courseForm.handleSubmit(handleAddCourse)} className="space-y-4">
                        <FormField
                          control={courseForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Course title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={courseForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Course description..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={courseForm.control}
                            name="difficulty_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Difficulty Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={courseForm.control}
                            name="estimated_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Est. Hours</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit">Add Course</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              
              {activeTab === "paths" && (
                <Dialog open={isAddingPath} onOpenChange={setIsAddingPath}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Add Learning Path
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Learning Path</DialogTitle>
                      <DialogDescription>
                        Create a new learning path for specific roles or departments
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...pathForm}>
                      <form onSubmit={pathForm.handleSubmit(handleAddPath)} className="space-y-4">
                        <FormField
                          control={pathForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Learning path name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={pathForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Learning path description..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={pathForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Front Desk">Front Desk</SelectItem>
                                    <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                                    <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                                    <SelectItem value="Kitchen">Kitchen</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                    <SelectItem value="Spa">Spa</SelectItem>
                                    <SelectItem value="Management">Management</SelectItem>
                                    <SelectItem value="All">All Departments</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={pathForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="trainee">Trainee</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit">Add Learning Path</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="courses" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Courses</span>
              </TabsTrigger>
              <TabsTrigger value="paths" className="gap-2">
                <BarChart className="h-4 w-4" />
                <span className="hidden sm:inline">Learning Paths</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="courses">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map(course => (
                    <Card key={course.id}>
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                        <CardDescription>
                          {course.difficulty_level.charAt(0).toUpperCase() + course.difficulty_level.slice(1)} · 
                          {course.estimated_hours} {course.estimated_hours === 1 ? 'hour' : 'hours'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {courses.length === 0 && (
                    <div className="col-span-full text-center p-8">
                      <p className="text-muted-foreground">No courses found. Add your first course!</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="paths">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {learningPaths.map(path => (
                    <Card key={path.id}>
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{path.name}</CardTitle>
                        <CardDescription>
                          {path.department || 'All Departments'} · 
                          {path.role.charAt(0).toUpperCase() + path.role.slice(1)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{path.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {learningPaths.length === 0 && (
                    <div className="col-span-full text-center p-8">
                      <p className="text-muted-foreground">No learning paths found. Add your first learning path!</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="users">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-10 px-4 text-left font-medium">Name</th>
                          <th className="h-10 px-4 text-left font-medium">Role</th>
                          <th className="h-10 px-4 text-left font-medium">Department</th>
                          <th className="h-10 px-4 text-left font-medium">Position</th>
                          <th className="h-10 px-4 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id} className="border-b">
                            <td className="p-4">{user.first_name} {user.last_name}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4">{user.department || '-'}</td>
                            <td className="p-4">{user.position || '-'}</td>
                            <td className="p-4">
                              {user.onboarding_completed ? (
                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                  Onboarded
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {users.length === 0 && (
                      <div className="text-center p-8">
                        <p className="text-muted-foreground">No users found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide settings for the learning platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Coming soon</h3>
                    <p className="text-sm text-muted-foreground">
                      Additional administrative settings will be available in future updates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
