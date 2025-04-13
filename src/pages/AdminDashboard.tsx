import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PlusCircle, UserIcon, BookOpen, BarChart, Settings, TrendingUp, Users, Award, PieChart, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

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
  experience_level: string | null;
  avatar_url: string | null;
  phone: string | null;
  joined_at?: string;
  onboarding_completed: boolean;
}

interface UserStats {
  total: number;
  active: number;
  newUsers: number;
  completedOnboarding: number;
}

interface CourseStats {
  total: number;
  totalEnrollments: number;
  completionRate: number;
  averageRating: number;
}

interface TopCourse {
  id: string;
  title: string;
  enrollment_count: number;
  completion_rate: number;
}

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
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [courses, setCourses] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isAddingPath, setIsAddingPath] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    active: 0,
    newUsers: 0,
    completedOnboarding: 0
  });
  const [courseStats, setCourseStats] = useState<CourseStats>({
    total: 0,
    totalEnrollments: 0,
    completionRate: 0,
    averageRating: 0
  });
  const [recentUsers, setRecentUsers] = useState<UserInfo[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [departmentDistribution, setDepartmentDistribution] = useState<Record<string, number>>({});
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  const courseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      difficulty_level: "beginner",
      estimated_hours: 1
    }
  });

  const pathForm = useForm({
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
      if (tab === "overview" || tab === "analytics") {
        await fetchOverviewData();
      }
      
      if (tab === "users" || tab === "overview") {
        await fetchUserData();
      }

      if (tab === "recommendations" || tab === "overview") {
        await fetchRecommendationData();
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

  const fetchOverviewData = async () => {
    try {
      // Fetch user stats
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      setUserStats({
        total: users?.length || 0,
        active: users?.length || 0,
        newUsers: Math.round((users?.length || 0) * 0.1),
        completedOnboarding: users?.filter(u => u.onboarding_completed).length || 0
      });

      // Fetch department distribution
      const departmentCounts: Record<string, number> = {};
      users?.forEach(user => {
        const dept = user.department || 'Unassigned';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      });
      setDepartmentDistribution(departmentCounts);

      // Fetch course stats
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*');

      if (coursesError) throw coursesError;

      // Fetch enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('user_courses')
        .select('*');

      if (enrollmentsError) throw enrollmentsError;

      // Calculate stats
      const totalEnrollments = enrollments?.length || 0;
      const completedEnrollments = enrollments?.filter(e => e.completed).length || 0;
      const completionRate = totalEnrollments ? (completedEnrollments / totalEnrollments) * 100 : 0;

      setCourseStats({
        total: courses?.length || 0,
        totalEnrollments,
        completionRate,
        averageRating: 4.2 // Placeholder - would need actual ratings data
      });

      // Fetch top courses
      const topCoursesList: TopCourse[] = [];
      const courseMap = new Map();
      
      courses?.forEach(course => courseMap.set(course.id, { 
        id: course.id, 
        title: course.title, 
        enrollment_count: 0,
        completion_rate: 0
      }));
      
      enrollments?.forEach(enrollment => {
        const course = courseMap.get(enrollment.course_id);
        if (course) {
          course.enrollment_count = (course.enrollment_count || 0) + 1;
          if (enrollment.completed) {
            course.completion_count = (course.completion_count || 0) + 1;
          }
        }
      });
      
      courseMap.forEach(course => {
        course.completion_rate = course.enrollment_count 
          ? ((course.completion_count || 0) / course.enrollment_count) * 100 
          : 0;
        topCoursesList.push(course);
      });
      
      setTopCourses(topCoursesList
        .sort((a, b) => b.enrollment_count - a.enrollment_count)
        .slice(0, 5)
      );

    } catch (error) {
      console.error("Error fetching overview data:", error);
      throw error;
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, department, position, experience_level, avatar_url, phone, onboarding_completed')
        .limit(10);

      if (error) throw error;
      setRecentUsers(users || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  const fetchRecommendationData = async () => {
    try {
      // This is a placeholder - in a real implementation, you would fetch 
      // real recommendations from your backend
      
      // Mock recommendations based on departments
      const { data: departments, error } = await supabase
        .from('profiles')
        .select('department')
        .not('department', 'is', null)
        .order('department');
        
      if (error) throw error;
      
      const uniqueDepartments = [...new Set(departments?.map(d => d.department))];
      const mockRecommendations = uniqueDepartments.slice(0, 5).map(dept => ({
        department: dept,
        topSkillGaps: ['Communication', 'Customer Service', 'Technical Knowledge'],
        recommendedCourses: [
          { title: `${dept} Fundamentals`, priority: 'High' },
          { title: 'Leadership Skills', priority: 'Medium' },
          { title: 'Customer Experience', priority: 'Medium' }
        ]
      }));
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error("Error fetching recommendation data:", error);
      throw error;
    }
  };

  const handleAddCourse = async (values: z.infer<typeof courseSchema>) => {
    try {
      const { error } = await supabase
        .from('courses')
        .insert({
          title: values.title,
          description: values.description,
          difficulty_level: values.difficulty_level,
          estimated_hours: values.estimated_hours
        });
        
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
        .insert({
          name: values.name,
          description: values.description,
          department: values.department,
          role: values.role as "admin" | "manager" | "staff" | "trainee"
        });
        
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

  const handleRunAssessment = async () => {
    toast({
      title: "Assessment Started",
      description: "Generating new AI recommendations based on latest data..."
    });
    
    setTimeout(() => {
      toast({
        title: "Assessment Complete",
        description: "AI recommendations have been updated."
      });
    }, 3000);
  };

  return (
    <div className="container py-6">
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
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">AI Recommendations</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {userStats.newUsers} new this month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats.active}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((userStats.active / userStats.total) * 100)}% of total users
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{courseStats.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {courseStats.totalEnrollments} total enrollments
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{courseStats.completionRate.toFixed(1)}%</div>
                    <Progress value={courseStats.completionRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="md:col-span-2 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Courses</CardTitle>
                    <CardDescription>Most popular courses by enrollment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="h-10 px-4 text-left font-medium">Course</th>
                              <th className="h-10 px-4 text-center font-medium">Enrollments</th>
                              <th className="h-10 px-4 text-center font-medium">Completion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topCourses.length > 0 ? (
                              topCourses.map(course => (
                                <tr key={course.id} className="border-b">
                                  <td className="p-4 font-medium">{course.title}</td>
                                  <td className="p-4 text-center">{course.enrollment_count}</td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <span>{course.completion_rate.toFixed(0)}%</span>
                                      <Progress 
                                        value={course.completion_rate} 
                                        className="w-16 h-2" 
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                  No course data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Latest user registrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentUsers.slice(0, 5).map(user => (
                        <div key={user.id} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url}
                                alt={`${user.first_name} ${user.last_name}`}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <UserIcon className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-none">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.department || user.position || user.role}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {'Recently joined'}
                          </div>
                        </div>
                      ))}
                      
                      {recentUsers.length === 0 && (
                        <p className="text-sm text-muted-foreground">No recent users</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      onClick={() => setActiveTab("users")}
                    >
                      View all users
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="analytics">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Distribution of users by department</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-4">
                    {Object.entries(departmentDistribution).map(([dept, count]) => (
                      <div key={dept} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{dept}</span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({Math.round((count / userStats.total) * 100)}%)
                          </span>
                        </div>
                        <Progress value={(count / userStats.total) * 100} />
                      </div>
                    ))}
                    
                    {Object.keys(departmentDistribution).length === 0 && (
                      <p className="text-sm text-muted-foreground">No department data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Status</CardTitle>
                  <CardDescription>Progress of user onboarding</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-center py-8">
                      <div className="relative h-40 w-40">
                        <PieChart className="h-40 w-40 text-muted-foreground/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl font-bold">
                            {Math.round((userStats.completedOnboarding / userStats.total) * 100)}%
                          </span>
                          <span className="text-xs text-muted-foreground">Completed</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="rounded-lg bg-muted p-3">
                        <div className="text-xl font-bold">{userStats.completedOnboarding}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <div className="text-xl font-bold">{userStats.total - userStats.completedOnboarding}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Course Activity</CardTitle>
                  <CardDescription>Overview of course engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-lg bg-muted p-6">
                      <BookOpen className="h-8 w-8 text-primary" />
                      <div className="text-2xl font-bold">{courseStats.total}</div>
                      <div className="text-sm text-muted-foreground">Active Courses</div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-lg bg-muted p-6">
                      <Users className="h-8 w-8 text-primary" />
                      <div className="text-2xl font-bold">{courseStats.totalEnrollments}</div>
                      <div className="text-sm text-muted-foreground">Total Enrollments</div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-lg bg-muted p-6">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-2xl font-bold">{courseStats.averageRating.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Average Rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      <th className="h-10 px-4 text-left font-medium">Experience</th>
                      <th className="h-10 px-4 text-left font-medium">Status</th>
                      <th className="h-10 px-4 text-left font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map(user => (
                      <tr key={user.id} className="border-b">
                        <td className="p-4 font-medium">{user.first_name} {user.last_name}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">{user.department || '-'}</td>
                        <td className="p-4">{user.position || '-'}</td>
                        <td className="p-4">{user.experience_level || '-'}</td>
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
                        <td className="p-4 text-muted-foreground">
                          {'Recently joined'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {recentUsers.length === 0 && (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">No users found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="recommendations">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">AI Training Recommendations</h2>
                  <p className="text-sm text-muted-foreground">
                    Personalized learning recommendations based on skill gaps analysis
                  </p>
                </div>
                <Button onClick={handleRunAssessment}>
                  Run New Assessment
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{rec.department}</CardTitle>
                      <CardDescription>
                        Top skill gaps: {rec.topSkillGaps.join(', ')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium mb-2">Recommended Courses:</h4>
                      <ul className="space-y-2">
                        {rec.recommendedCourses.map((course, i) => (
                          <li key={i} className="flex justify-between items-center">
                            <span className="text-sm">{course.title}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              course.priority === 'High' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {course.priority}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full text-sm">
                        View Full Report
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              {recommendations.length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>No recommendations available</CardTitle>
                    <CardDescription>
                      Run an assessment to generate personalized training recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-8">
                    <Button onClick={handleRunAssessment}>
                      Generate Recommendations
                    </Button>
                  </CardContent>
                </Card>
              )}
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
    </div>
  );
}
