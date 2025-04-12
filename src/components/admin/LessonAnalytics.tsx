import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, Clock, UserCheck, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface LessonMetrics {
  lesson_id: string;
  lesson_title: string;
  total_views: number;
  unique_viewers: number;
  average_duration: number;
  completion_rate: number;
}

interface CourseOption {
  id: string;
  title: string;
}

export default function LessonAnalytics() {
  const [lessonMetrics, setLessonMetrics] = useState<LessonMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('30d');
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessonMetrics();
    }
  }, [selectedCourse, timeRange]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      
      if (error) throw error;
      
      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error fetching courses',
        description: 'Could not load the courses. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const fetchLessonMetrics = async () => {
    setIsLoading(true);
    try {
      // Calculate the date based on the time range
      const now = new Date();
      let fromDate = new Date();
      
      if (timeRange === '7d') {
        fromDate.setDate(now.getDate() - 7);
      } else if (timeRange === '30d') {
        fromDate.setDate(now.getDate() - 30);
      } else if (timeRange === '90d') {
        fromDate.setDate(now.getDate() - 90);
      } else if (timeRange === 'all') {
        fromDate = new Date(0); // Beginning of time
      }

      const fromDateString = fromDate.toISOString();

      // Fetch lessons for the course
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, title')
        .eq('course_id', selectedCourse)
        .order('order_index');

      if (lessonsError) throw lessonsError;
      
      if (!lessons || lessons.length === 0) {
        setLessonMetrics([]);
        setIsLoading(false);
        return;
      }

      // For each lesson, fetch the metrics
      const metricsPromises = lessons.map(async (lesson) => {
        // Get view metrics
        const { data: viewData, error: viewError } = await supabase
          .from('lesson_views')
          .select('view_count, total_duration')
          .eq('lesson_id', lesson.id)
          .eq('course_id', selectedCourse)
          .gte('last_viewed_at', fromDateString);

        if (viewError) throw viewError;

        // Get unique viewers count
        const { count: uniqueViewers, error: countError } = await supabase
          .from('lesson_views')
          .select('user_id', { count: 'exact', head: true })
          .eq('lesson_id', lesson.id)
          .eq('course_id', selectedCourse)
          .gte('last_viewed_at', fromDateString);

        if (countError) throw countError;

        // Get completion metrics
        const { data: completionData, error: completionError } = await supabase
          .from('user_lessons')
          .select('completed')
          .eq('lesson_id', lesson.id)
          .eq('course_id', selectedCourse)
          .gte('started_at', fromDateString);

        if (completionError) throw completionError;

        // Calculate metrics
        const totalViews = viewData ? viewData.reduce((sum, item) => sum + item.view_count, 0) : 0;
        const totalDuration = viewData ? viewData.reduce((sum, item) => sum + item.total_duration, 0) : 0;
        const averageDuration = totalViews > 0 ? totalDuration / totalViews : 0;
        
        const totalStarted = completionData ? completionData.length : 0;
        const totalCompleted = completionData ? completionData.filter(item => item.completed).length : 0;
        const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;

        return {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          total_views: totalViews,
          unique_viewers: uniqueViewers || 0,
          average_duration: averageDuration,
          completion_rate: completionRate,
        };
      });

      const metricsResults = await Promise.all(metricsPromises);
      setLessonMetrics(metricsResults);
    } catch (error) {
      console.error('Error fetching lesson metrics:', error);
      toast({
        title: 'Error fetching analytics',
        description: 'Could not load lesson analytics. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const viewsData = lessonMetrics.map((metric) => ({
    name: metric.lesson_title.length > 20 
      ? `${metric.lesson_title.substring(0, 20)}...` 
      : metric.lesson_title,
    "Total Views": metric.total_views,
    "Unique Viewers": metric.unique_viewers,
  }));

  const durationData = lessonMetrics.map((metric) => ({
    name: metric.lesson_title.length > 20 
      ? `${metric.lesson_title.substring(0, 20)}...` 
      : metric.lesson_title,
    "Average Duration (seconds)": metric.average_duration,
  }));

  const completionData = lessonMetrics.map((metric) => ({
    name: metric.lesson_title.length > 20 
      ? `${metric.lesson_title.substring(0, 20)}...` 
      : metric.lesson_title,
    "Completion Rate (%)": metric.completion_rate,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Lesson Analytics</h2>
        <div className="flex items-center space-x-4">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchLessonMetrics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="views" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Views
            </TabsTrigger>
            <TabsTrigger value="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
            </TabsTrigger>
            <TabsTrigger value="completion" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Completion
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="views" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lesson Views</CardTitle>
                <CardDescription>
                  Total and unique views for each lesson in the selected course
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : viewsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      width={500}
                      height={300}
                      data={viewsData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Total Views" fill="#8884d8" />
                      <Bar dataKey="Unique Viewers" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available for the selected course and time range</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {!isLoading && viewsData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed View Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Lesson</th>
                          <th className="text-right py-3 px-4">Total Views</th>
                          <th className="text-right py-3 px-4">Unique Viewers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lessonMetrics.map((metric) => (
                          <tr key={metric.lesson_id} className="border-b">
                            <td className="py-3 px-4">{metric.lesson_title}</td>
                            <td className="text-right py-3 px-4">{metric.total_views}</td>
                            <td className="text-right py-3 px-4">{metric.unique_viewers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="duration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Viewing Duration</CardTitle>
                <CardDescription>
                  Average time spent on each lesson in the selected course
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : durationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      width={500}
                      height={300}
                      data={durationData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Average Duration (seconds)" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available for the selected course and time range</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {!isLoading && durationData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Duration Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Lesson</th>
                          <th className="text-right py-3 px-4">Average Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lessonMetrics.map((metric) => (
                          <tr key={metric.lesson_id} className="border-b">
                            <td className="py-3 px-4">{metric.lesson_title}</td>
                            <td className="text-right py-3 px-4">{formatDuration(metric.average_duration)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="completion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lesson Completion</CardTitle>
                <CardDescription>
                  Percentage of users who completed each lesson in the selected course
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : completionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      width={500}
                      height={300}
                      data={completionData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Completion Rate (%)" fill="#ff8042" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available for the selected course and time range</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {!isLoading && completionData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Completion Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Lesson</th>
                          <th className="text-right py-3 px-4">Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lessonMetrics.map((metric) => (
                          <tr key={metric.lesson_id} className="border-b">
                            <td className="py-3 px-4">{metric.lesson_title}</td>
                            <td className="text-right py-3 px-4">{metric.completion_rate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 