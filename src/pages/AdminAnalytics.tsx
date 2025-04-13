import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Brain, FileDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAIAnalysis, generateAnalyticsReport, type AnalyticsData } from '@/utils/analyticsUtils';
import { UserAnalytics } from '@/components/admin/UserAnalytics';

// Common interfaces for analytics data
interface CourseStatistics {
  id: string;
  title: string;
  enrollments: number;
  completionRate: number;
  averageScore: number;
}

interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  roleDistribution: {
    admin: number;
    manager: number;
    staff: number;
    trainee: number;
  };
}

interface OverallStatistics {
  totalCourses: number;
  totalLessons: number;
  totalQuizzes: number;
  totalEnrollments: number;
  averageCompletionRate: number;
}

export default function AdminAnalytics() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState<CourseStatistics[]>([]);
  const [userStats, setUserStats] = useState<UserStatistics>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    roleDistribution: {
      admin: 0,
      manager: 0,
      staff: 0,
      trainee: 0,
    },
  });
  const [overallStats, setOverallStats] = useState<OverallStatistics>({
    totalCourses: 0,
    totalLessons: 0,
    totalQuizzes: 0,
    totalEnrollments: 0,
    averageCompletionRate: 0,
  });
  const [timeRange, setTimeRange] = useState('last30days');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  // Function to fetch all analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCourseStatistics(),
        fetchUserStatistics(),
        fetchOverallStatistics(),
        fetchUsers(),
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load analytics data. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch course-specific statistics
  const fetchCourseStatistics = async () => {
    try {
      // Get all courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title');

      if (coursesError) throw coursesError;
      if (!courses) return;

      // For each course, get enrollments and progress data
      const courseStatsPromises = courses.map(async (course) => {
        // Get course enrollments
        const { count: enrollments, error: enrollmentsError } = await supabase
          .from('user_courses')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        if (enrollmentsError) throw enrollmentsError;

        // Get completion data
        const { data: progressData, error: progressError } = await supabase
          .from('user_courses')
          .select('progress')
          .eq('course_id', course.id);

        if (progressError) throw progressError;

        // Calculate completion rate
        const completedUsers = progressData?.filter(p => p.progress === 100).length || 0;
        const completionRate = progressData && progressData.length > 0
          ? (completedUsers / progressData.length) * 100
          : 0;

        // Get quiz scores for this course
        const { data: quizResults, error: quizError } = await supabase
          .from('quiz_attempts')
          .select(`
            score,
            quizzes!inner(course_id)
          `)
          .eq('quizzes.course_id', course.id);

        if (quizError) throw quizError;

        // Calculate average score
        const totalScore = quizResults?.reduce((acc, result) => acc + result.score, 0) || 0;
        const averageScore = quizResults && quizResults.length > 0
          ? totalScore / quizResults.length
          : 0;

        return {
          id: course.id,
          title: course.title,
          enrollments: enrollments || 0,
          completionRate: parseFloat(completionRate.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2)),
        };
      });

      const resolvedCourseStats = await Promise.all(courseStatsPromises);
      setCourseStats(resolvedCourseStats);
    } catch (error) {
      console.error('Error fetching course statistics:', error);
      throw error;
    }
  };

  // Fetch user-related statistics
  const fetchUserStatistics = async () => {
    try {
      // Total users count
      const { count: totalUsers, error: totalUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (totalUsersError) throw totalUsersError;

      // Active users (users who have logged in within the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers, error: activeUsersError } = await supabase
        .from('user_login_streaks')
        .select('*', { count: 'exact', head: true })
        .gt('last_login', thirtyDaysAgo.toISOString());

      if (activeUsersError) throw activeUsersError;

      // New users this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { count: newUsers, error: newUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('joined_at', firstDayOfMonth.toISOString());

      if (newUsersError) throw newUsersError;

      // Role distribution
      const { data: roleData, error: rolesError } = await supabase
        .from('profiles')
        .select('role')
        .then(({ data, error }) => {
          if (error) throw error;
          const counts = data.reduce((acc: { [key: string]: number }, profile) => {
            acc[profile.role] = (acc[profile.role] || 0) + 1;
            return acc;
          }, {}) as { [K in 'admin' | 'manager' | 'staff' | 'trainee']: number };
          return { data: counts, error: null };
        });

      if (rolesError) throw rolesError;

      const roleDistribution = {
        admin: roleData?.admin ?? 0,
        manager: roleData?.manager ?? 0,
        staff: roleData?.staff ?? 0,
        trainee: roleData?.trainee ?? 0,
      };

      setUserStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersThisMonth: newUsers || 0,
        roleDistribution,
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  };

  // Fetch overall platform statistics
  const fetchOverallStatistics = async () => {
    try {
      // Total courses
      const { count: totalCourses, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      if (coursesError) throw coursesError;

      // Total lessons
      const { count: totalLessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('*', { count: 'exact', head: true });

      if (lessonsError) throw lessonsError;

      // Total quizzes
      const { count: totalQuizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true });

      if (quizzesError) throw quizzesError;

      // Total enrollments
      const { count: totalEnrollments, error: enrollmentsError } = await supabase
        .from('user_courses')
        .select('*', { count: 'exact', head: true });

      if (enrollmentsError) throw enrollmentsError;

      // Average completion rate - optimized query
      const { data: progressData, error: progressError } = await supabase
        .from('user_courses')
        .select('progress');

      if (progressError) throw progressError;

      const averageCompletionRate = progressData && progressData.length > 0
        ? progressData.reduce((acc, item) => acc + (item.progress || 0), 0) / progressData.length
        : 0;

      setOverallStats({
        totalCourses: totalCourses || 0,
        totalLessons: totalLessons || 0,
        totalQuizzes: totalQuizzes || 0,
        totalEnrollments: totalEnrollments || 0,
        averageCompletionRate: parseFloat(averageCompletionRate.toFixed(2)),
      });
    } catch (error) {
      console.error('Error fetching overall statistics:', error);
      throw error;
    }
  };

  const handleGenerateAIAnalysis = async () => {
    try {
      setIsGeneratingAi(true);
      setIsAiDialogOpen(true);
      
      const analyticsData: AnalyticsData = {
        userStats,
        courseStats,
        overallStats
      };
      
      const analysis = await generateAIAnalysis(analyticsData);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate AI analysis. Please try again later.',
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleDownloadReport = async (format: 'pdf' | 'markdown' = 'markdown') => {
    try {
      setIsDownloading(true);
      
      const analyticsData: AnalyticsData = {
        userStats,
        courseStats,
        overallStats
      };
      
      const report = await generateAnalyticsReport(analyticsData);
      
      if (format === 'markdown') {
        // Create blob and download
        const blob = new Blob([report as string], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For PDF, the report is already a Blob or string
        const link = document.createElement('a');
        const blob = typeof report === 'string' 
          ? new Blob([report], { type: 'application/pdf' })
          : report as Blob;
        link.href = URL.createObjectURL(blob);
        link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download report. Please try again later.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Access control - only allow admins
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

  // Placeholder for chart components (these would be actual charts in a real implementation)
  const RoleDistributionChart = () => (
    <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-md p-4">
      <div className="text-center mb-4">Role Distribution</div>
      <div className="flex w-full justify-around">
        <div className="flex flex-col items-center">
          <div className="h-28 w-10 bg-primary/80 rounded-t-md relative" 
               style={{ height: `${(userStats.roleDistribution.admin / userStats.totalUsers) * 200}px` }}>
          </div>
          <div className="mt-2">Admin</div>
          <div className="text-sm text-muted-foreground">{userStats.roleDistribution.admin}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-28 w-10 bg-primary/60 rounded-t-md relative" 
               style={{ height: `${(userStats.roleDistribution.manager / userStats.totalUsers) * 200}px` }}>
          </div>
          <div className="mt-2">Manager</div>
          <div className="text-sm text-muted-foreground">{userStats.roleDistribution.manager}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-28 w-10 bg-primary/40 rounded-t-md relative" 
               style={{ height: `${(userStats.roleDistribution.staff / userStats.totalUsers) * 200}px` }}>
          </div>
          <div className="mt-2">Staff</div>
          <div className="text-sm text-muted-foreground">{userStats.roleDistribution.staff}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-28 w-10 bg-primary/20 rounded-t-md relative" 
               style={{ height: `${(userStats.roleDistribution.trainee / userStats.totalUsers) * 200}px` }}>
          </div>
          <div className="mt-2">Trainee</div>
          <div className="text-sm text-muted-foreground">{userStats.roleDistribution.trainee}</div>
        </div>
      </div>
    </div>
  );

  const CourseEnrollmentChart = () => (
    <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-md p-4">
      <div className="text-center mb-4">Course Enrollments</div>
      <div className="flex items-end h-40 space-x-2 mb-4">
        {courseStats.slice(0, 5).map((course, index) => (
          <div key={course.id} className="flex flex-col items-center">
            <div 
              className="w-12 bg-primary rounded-t-md" 
              style={{ 
                height: `${Math.min(course.enrollments * 3, 140)}px`,
                opacity: 1 - (index * 0.15)
              }}
            ></div>
            <div className="text-xs mt-2 max-w-20 text-center truncate" title={course.title}>
              {course.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CompletionRateChart = () => (
    <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-md p-4">
      <div className="text-center mb-4">Course Completion Rates</div>
      <div className="grid grid-cols-3 gap-4 w-full">
        {courseStats.slice(0, 3).map(course => (
          <div key={course.id} className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center border-8 border-muted">
              <div 
                className="absolute w-24 h-24 rounded-full border-8 border-primary"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(course.completionRate / 100 * Math.PI * 2)}% ${50 - 50 * Math.cos(course.completionRate / 100 * Math.PI * 2)}%, ${course.completionRate > 75 ? '100% 100%, 0% 100%, 0% 0%' : course.completionRate > 50 ? '100% 100%, 0% 100%, 0% 50%' : course.completionRate > 25 ? '100% 100%, 50% 100%' : ''})`
                }}
              ></div>
              <span className="text-lg font-bold">{course.completionRate}%</span>
            </div>
            <div className="text-sm mt-2 max-w-32 text-center truncate" title={course.title}>
              {course.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const fetchUsers = async () => {
    try {
      const { data: userData, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and reporting for the Learning Village platform.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleGenerateAIAnalysis()}
              disabled={isGeneratingAi || loading}
            >
              {isGeneratingAi ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              AI Analysis
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleDownloadReport('pdf')}
              disabled={isDownloading || loading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Export as PDF
            </Button>

            <Button
              variant="outline"
              onClick={() => handleDownloadReport('markdown')}
              disabled={isDownloading || loading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Export as Markdown
            </Button>
          </div>
        </div>

        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and reporting for the Learning Village platform.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <Tabs defaultValue="overview" className="w-full">
              <div className="flex justify-between items-center mb-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="courses">Courses</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last7days">Last 7 days</SelectItem>
                      <SelectItem value="last30days">Last 30 days</SelectItem>
                      <SelectItem value="last90days">Last 90 days</SelectItem>
                      <SelectItem value="lastYear">Last year</SelectItem>
                      <SelectItem value="allTime">All time</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport('pdf')}
                    disabled={isDownloading || loading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Export as PDF
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport('markdown')}
                    disabled={isDownloading || loading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Export as Markdown
                  </Button>

                  <Button variant="outline" onClick={() => fetchAnalyticsData()}>
                    Refresh Data
                  </Button>
                </div>
              </div>

              <TabsContent value="overview" className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        +{userStats.newUsersThisMonth} this month
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{userStats.activeUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        {((userStats.activeUsers / userStats.totalUsers) * 100).toFixed(1)}% of total users
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Courses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overallStats.totalCourses}</div>
                      <p className="text-xs text-muted-foreground">
                        {overallStats.totalLessons} total lessons
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Average Completion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overallStats.averageCompletionRate}%</div>
                      <p className="text-xs text-muted-foreground">
                        Across all courses
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Distribution</CardTitle>
                      <CardDescription>
                        Breakdown of users by role
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RoleDistributionChart />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Popular Courses</CardTitle>
                      <CardDescription>
                        Top courses by enrollment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CourseEnrollmentChart />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="courses" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Course Completion Rates</CardTitle>
                      <CardDescription>
                        Percentage of users who completed each course
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CompletionRateChart />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Course Performance</CardTitle>
                      <CardDescription>
                        Engagement metrics for all courses
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Course</th>
                            <th className="text-center p-3">Enrollments</th>
                            <th className="text-center p-3">Completion</th>
                            <th className="text-center p-3">Avg. Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseStats.map(course => (
                            <tr key={course.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 truncate max-w-40" title={course.title}>
                                {course.title}
                              </td>
                              <td className="text-center p-3">{course.enrollments}</td>
                              <td className="text-center p-3">{course.completionRate}%</td>
                              <td className="text-center p-3">{course.averageScore}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users">
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Overview</CardTitle>
                      <CardDescription>
                        Overview of user statistics and role distribution
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-semibold mb-4">User Statistics</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span>Total Users</span>
                              <span className="font-medium">{userStats.totalUsers}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Active Users</span>
                              <span className="font-medium">{userStats.activeUsers}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>New Users This Month</span>
                              <span className="font-medium">{userStats.newUsersThisMonth}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Role Distribution</h3>
                          <RoleDistributionChart />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Details</CardTitle>
                      <CardDescription>
                        Detailed analytics for individual users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserAnalytics users={users} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>AI Analysis Report</DialogTitle>
            <DialogDescription>
              Comprehensive analysis of your learning platform's performance
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            {isGeneratingAi ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Generating analysis...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{aiAnalysis}</div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const blob = new Blob([aiAnalysis], { type: 'text/plain;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `ai_analysis_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              disabled={!aiAnalysis}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Analysis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 