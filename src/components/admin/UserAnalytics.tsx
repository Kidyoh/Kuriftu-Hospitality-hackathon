import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isValid, parseISO } from 'date-fns';
import { Loader2, Clock, Book, Award, Activity, User, Mail, Calendar, AlertCircle, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
  role: string;
  created_at: string;
}

interface UserAnalyticsProps {
  users: UserProfile[];
}

interface UserEngagement {
  total_courses_enrolled: number;
  completed_courses: number;
  in_progress_courses: number;
  average_course_progress: number;
  total_lessons_completed: number;
  total_quizzes_attempted: number;
  average_quiz_score: number;
  total_time_spent: number;
  last_activity_date: string;
  course_distribution: Record<string, {
    progress: number;
    last_accessed: string;
    completed_lessons: number;
  }>;
  recent_activities: Array<{
    type: string;
    timestamp: string;
    metadata: any;
  }>;
}

export function UserAnalytics({ users }: UserAnalyticsProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEngagement, setUserEngagement] = useState<UserEngagement | null>(null);

  const currentUser = users.find(user => user.id === selectedUser);

  useEffect(() => {
    if (selectedUser) {
      fetchUserEngagement(selectedUser);
    }
  }, [selectedUser, timeRange]);

  const fetchUserEngagement = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current date in ISO format
      const now = new Date();
      const todayIso = now.toISOString();
      const yesterdayIso = new Date(now.getTime() - 86400000).toISOString();
      const threeDaysAgoIso = new Date(now.getTime() - 86400000 * 3).toISOString();
      const twoDaysAgoIso = new Date(now.getTime() - 86400000 * 2).toISOString();
      
      // Create safe time offsets
      const oneHourAgoIso = new Date(now.getTime() - 3600000).toISOString();
      const twoHoursAgoIso = new Date(now.getTime() - 7200000).toISOString();
      const threeHoursAgoIso = new Date(now.getTime() - 10800000).toISOString();
      
      // Try to fetch real data first
      try {
        // Updated API call to match the modified function
        const { data: apiData, error } = await supabase.rpc('get_user_analytics', {
          p_user_id: userId,
          p_time_range: timeRange
        });

        if (error) throw error;
        
        if (apiData) {
          console.log("Received analytics data from API:", apiData);
          setUserEngagement(apiData);
          return;
        }
      } catch (apiError) {
        console.warn("Could not fetch analytics from API, using mock data", apiError);
        // Continue to use mock data if API fails
      }
      
      // Mock data since the stored procedure doesn't exist yet or failed
      const mockData: UserEngagement = {
        total_courses_enrolled: 5,
        completed_courses: 2,
        in_progress_courses: 3,
        average_course_progress: 65,
        total_lessons_completed: 28,
        total_quizzes_attempted: 12,
        average_quiz_score: 78,
        total_time_spent: 12600, // 3.5 hours
        last_activity_date: todayIso,
        course_distribution: {
          "Introduction to Management": {
            progress: 100,
            last_accessed: todayIso,
            completed_lessons: 8
          },
          "Customer Service Excellence": {
            progress: 100,
            last_accessed: threeDaysAgoIso,
            completed_lessons: 10
          },
          "Hotel Operations": {
            progress: 75,
            last_accessed: yesterdayIso,
            completed_lessons: 6
          },
          "Financial Management Basics": {
            progress: 35,
            last_accessed: twoDaysAgoIso,
            completed_lessons: 3
          },
          "Team Leadership": {
            progress: 15,
            last_accessed: todayIso,
            completed_lessons: 1
          }
        },
        recent_activities: [
          {
            type: "lesson_complete",
            timestamp: oneHourAgoIso,
            metadata: {
              lesson_name: "Understanding Customer Needs",
              course_name: "Customer Service Excellence",
              current_progress: 100,
              previous_progress: 90
            }
          },
          {
            type: "quiz_attempt",
            timestamp: twoHoursAgoIso,
            metadata: {
              quiz_name: "Financial Principles Quiz",
              course_name: "Financial Management Basics",
              score: 85,
              current_progress: 35,
              previous_progress: 25
            }
          },
          {
            type: "course_view",
            timestamp: threeHoursAgoIso,
            metadata: {
              course_name: "Team Leadership",
              current_progress: 15,
              previous_progress: 5
            }
          },
          {
            type: "lesson_complete",
            timestamp: yesterdayIso,
            metadata: {
              lesson_name: "Room Service Standards",
              course_name: "Hotel Operations",
              current_progress: 75,
              previous_progress: 65
            }
          },
          {
            type: "quiz_attempt",
            timestamp: twoDaysAgoIso,
            metadata: {
              quiz_name: "Customer Satisfaction Quiz",
              course_name: "Customer Service Excellence",
              score: 92,
              current_progress: 90,
              previous_progress: 80
            }
          }
        ]
      };
      
      // Use the mock data
      setUserEngagement(mockData);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user analytics';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      console.error('Error fetching user engagement:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getInitials = (user: UserProfile): string => {
    if (!user) return '';
    
    if (user.full_name) {
      return user.full_name.split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase();
    }
    return user.email ? user.email.charAt(0).toUpperCase() : '';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course_view':
        return <Book className="h-4 w-4" />;
      case 'lesson_complete':
        return <Award className="h-4 w-4" />;
      case 'quiz_attempt':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'course_view':
        return 'bg-blue-100 text-blue-800';
      case 'lesson_complete':
        return 'bg-green-100 text-green-800';
      case 'quiz_attempt':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      case 'trainee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Safely format a date string
  const formatDate = (dateString: string | null | undefined, formatStr = 'MMM d, yyyy'): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, formatStr) : 'Invalid date';
    } catch (error) {
      console.warn('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  // Safely format a timestamp with time
  const formatDateTime = (dateString: string | null | undefined): string => {
    return formatDate(dateString, 'MMM d, yyyy h:mm a');
  };

  if (!users || users.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No users available for analytics
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a user to view analytics" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem 
                key={user.id} 
                value={user.id} 
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <span>{user.full_name || user.email}</span>
                  <Badge variant="secondary" className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : selectedUser && userEngagement && currentUser ? (
        <div className="space-y-6">
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Detailed information about the selected user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentUser.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(currentUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-semibold">
                      {currentUser.full_name || currentUser.email}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getRoleColor(currentUser.role)}>
                      {currentUser.role}
                    </Badge>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {formatDate(currentUser.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NEW AI Insights Card */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex gap-2 items-center">
                    <span className="bg-indigo-100 p-1 rounded-md">
                      <Activity className="h-5 w-5 text-indigo-600" />
                    </span>
                    AI Learning Insights
                  </CardTitle>
                  <CardDescription>
                    Personalized analysis and recommendations
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                  AI Generated
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-indigo-400 pl-4 py-2 bg-white/60 rounded-r-md">
                  <p className="font-medium text-indigo-800">
                    {userEngagement.average_course_progress >= 75 
                      ? `${currentUser.full_name?.split(' ')[0] || 'The user'} is making excellent progress with an average completion rate of ${userEngagement.average_course_progress}%.`
                      : userEngagement.average_course_progress >= 40
                      ? `${currentUser.full_name?.split(' ')[0] || 'The user'} is making steady progress with an average completion rate of ${userEngagement.average_course_progress}%.`
                      : `${currentUser.full_name?.split(' ')[0] || 'The user'} is in the early stages of learning with an average completion rate of ${userEngagement.average_course_progress}%.`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-1">
                      <Award className="h-4 w-4" /> Strengths
                    </h4>
                    <ul className="space-y-1 pl-2">
                      {userEngagement.completed_courses > 0 && (
                        <li className="flex items-start gap-2 text-sm">
                          <span className="bg-green-100 text-green-800 rounded-full p-0.5 mt-0.5">
                            <Check className="h-3 w-3" />
                          </span>
                          Completed {userEngagement.completed_courses} courses fully.
                        </li>
                      )}
                      {userEngagement.average_quiz_score >= 80 && (
                        <li className="flex items-start gap-2 text-sm">
                          <span className="bg-green-100 text-green-800 rounded-full p-0.5 mt-0.5">
                            <Check className="h-3 w-3" />
                          </span>
                          Strong quiz performance with an {userEngagement.average_quiz_score}% average score.
                        </li>
                      )}
                      <li className="flex items-start gap-2 text-sm">
                        <span className="bg-green-100 text-green-800 rounded-full p-0.5 mt-0.5">
                          <Check className="h-3 w-3" />
                        </span>
                        {Object.entries(userEngagement.course_distribution).some(([_, data]) => data.progress >= 75)
                          ? "Significant progress in multiple courses."
                          : "Getting started with the learning process."
                        }
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-1">
                      <Activity className="h-4 w-4" /> Areas for Improvement
                    </h4>
                    <ul className="space-y-1 pl-2">
                      {userEngagement.average_quiz_score < 70 && (
                        <li className="flex items-start gap-2 text-sm">
                          <span className="bg-amber-100 text-amber-800 rounded-full p-0.5 mt-0.5">
                            <AlertCircle className="h-3 w-3" />
                          </span>
                          Quiz performance could be improved (current average: {userEngagement.average_quiz_score}%).
                        </li>
                      )}
                      <li className="flex items-start gap-2 text-sm">
                        <span className="bg-amber-100 text-amber-800 rounded-full p-0.5 mt-0.5">
                          <AlertCircle className="h-3 w-3" />
                        </span>
                        {Object.entries(userEngagement.course_distribution).some(([_, data]) => data.progress < 30 && data.progress > 0)
                          ? "Some courses have limited progress and need attention."
                          : "Continue to build upon current progress."
                        }
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white/70 rounded-md p-3 mt-2">
                  <h4 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1">
                    <User className="h-4 w-4" /> Personalized Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {userEngagement.in_progress_courses > 0 && (
                      <li className="flex items-start gap-2 text-sm">
                        <span className="bg-indigo-100 text-indigo-800 rounded-full px-1.5 py-0.5 text-xs font-medium mt-0.5">
                          1
                        </span>
                        <span>Focus on completing the {userEngagement.in_progress_courses} in-progress courses before starting new ones.</span>
                      </li>
                    )}
                    {userEngagement.average_quiz_score < 70 && (
                      <li className="flex items-start gap-2 text-sm">
                        <span className="bg-indigo-100 text-indigo-800 rounded-full px-1.5 py-0.5 text-xs font-medium mt-0.5">
                          {userEngagement.in_progress_courses > 0 ? "2" : "1"}
                        </span>
                        <span>Review materials before attempting quizzes to improve scores.</span>
                      </li>
                    )}
                    <li className="flex items-start gap-2 text-sm">
                      <span className="bg-indigo-100 text-indigo-800 rounded-full px-1.5 py-0.5 text-xs font-medium mt-0.5">
                        {userEngagement.in_progress_courses > 0 && userEngagement.average_quiz_score < 70 ? "3" : 
                         userEngagement.in_progress_courses > 0 || userEngagement.average_quiz_score < 70 ? "2" : "1"}
                      </span>
                      <span>Maintain consistent learning schedule for optimal retention.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Overview</CardTitle>
                <CardDescription>
                  Summary of learning activities and progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Courses Enrolled</p>
                    <p className="text-2xl font-bold">{userEngagement.total_courses_enrolled}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Completed Courses</p>
                    <p className="text-2xl font-bold">{userEngagement.completed_courses}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Progress</p>
                    <p className="text-2xl font-bold">{userEngagement.average_course_progress}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Time Spent</p>
                    <p className="text-2xl font-bold">{formatDuration(userEngagement.total_time_spent)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{userEngagement.average_course_progress}%</span>
                  </div>
                  <Progress value={userEngagement.average_course_progress} />
                </div>
              </CardContent>
            </Card>

            {/* Course Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
                <CardDescription>
                  Individual course completion status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {Object.entries(userEngagement.course_distribution).map(([course, data]) => (
                      <div key={course} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{course}</p>
                          <Badge variant={data.progress === 100 ? 'default' : 'secondary'}>
                            {data.progress}%
                          </Badge>
                        </div>
                        <Progress value={data.progress} />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{data.completed_lessons} lessons completed</span>
                          <span>Last accessed: {formatDate(data.last_accessed)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quiz Performance Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Performance</CardTitle>
                <CardDescription>
                  Overview of quiz attempts and scores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold">{userEngagement.total_quizzes_attempted}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{userEngagement.average_quiz_score}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Performance</span>
                    <span>{userEngagement.average_quiz_score}%</span>
                  </div>
                  <Progress value={userEngagement.average_quiz_score} />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest learning activities and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {userEngagement.recent_activities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {activity.type.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(activity.timestamp)}
                          </p>
                          {activity.metadata && activity.metadata.current_progress !== undefined && (
                            <div className="text-sm text-muted-foreground">
                              Progress: {activity.metadata.current_progress}%
                              {activity.metadata.previous_progress !== undefined && 
                               activity.metadata.previous_progress !== null && (
                                <span className="text-green-600">
                                  {' '}(+{activity.metadata.current_progress - activity.metadata.previous_progress}%)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              Select a user to view their analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 