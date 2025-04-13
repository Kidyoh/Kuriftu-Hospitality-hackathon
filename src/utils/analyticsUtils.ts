import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export interface AnalyticsData {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    roleDistribution: {
      admin: number;
      manager: number;
      staff: number;
      trainee: number;
    };
  };
  courseStats: Array<{
    id: string;
    title: string;
    enrollments: number;
    completionRate: number;
    averageScore: number;
  }>;
  overallStats: {
    totalCourses: number;
    totalLessons: number;
    totalQuizzes: number;
    totalEnrollments: number;
    averageCompletionRate: number;
  };
  lessonMetrics?: Array<{
    lesson_id: string;
    lesson_title: string;
    total_views: number;
    unique_viewers: number;
    average_duration: number;
    completion_rate: number;
  }>;
}

export async function generateAIAnalysis(data: AnalyticsData) {
  try {
    const prompt = `As an AI analyst for a learning management system, analyze the following data and provide insights:

Platform Overview:
- Total Users: ${data.userStats.totalUsers}
- Active Users: ${data.userStats.activeUsers}
- New Users This Month: ${data.userStats.newUsersThisMonth}
- Role Distribution: ${JSON.stringify(data.userStats.roleDistribution)}

Course Statistics:
${data.courseStats.map(course => `- ${course.title}: ${course.enrollments} enrollments, ${course.completionRate}% completion, ${course.averageScore}% avg score`).join('\n')}

Overall Statistics:
- Total Courses: ${data.overallStats.totalCourses}
- Total Lessons: ${data.overallStats.totalLessons}
- Total Quizzes: ${data.overallStats.totalQuizzes}
- Total Enrollments: ${data.overallStats.totalEnrollments}
- Average Completion Rate: ${data.overallStats.averageCompletionRate}%

Please provide:
1. Key insights and trends
2. Areas of concern or improvement
3. Recommendations for optimization
4. Engagement patterns
5. User behavior analysis
6. Course performance analysis
7. Predictions for future trends

Format the response in clear sections with bullet points where appropriate.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return 'Unable to generate AI analysis at this time.';
  }
}

export async function generateAnalyticsReport(data: AnalyticsData, format: 'csv' | 'pdf' = 'csv') {
  if (format === 'csv') {
    const csvContent = [
      // Header
      ['Report Type', 'Metric', 'Value', 'Date'],
      
      // User Statistics
      ['User Stats', 'Total Users', data.userStats.totalUsers, new Date().toISOString()],
      ['User Stats', 'Active Users', data.userStats.activeUsers, new Date().toISOString()],
      ['User Stats', 'New Users This Month', data.userStats.newUsersThisMonth, new Date().toISOString()],
      
      // Role Distribution
      ['Role Distribution', 'Admin', data.userStats.roleDistribution.admin, new Date().toISOString()],
      ['Role Distribution', 'Manager', data.userStats.roleDistribution.manager, new Date().toISOString()],
      ['Role Distribution', 'Staff', data.userStats.roleDistribution.staff, new Date().toISOString()],
      ['Role Distribution', 'Trainee', data.userStats.roleDistribution.trainee, new Date().toISOString()],
      
      // Course Statistics
      ...data.courseStats.map(course => [
        'Course Stats',
        course.title,
        `Enrollments: ${course.enrollments}, Completion: ${course.completionRate}%, Score: ${course.averageScore}%`,
        new Date().toISOString()
      ]),
      
      // Overall Statistics
      ['Platform Stats', 'Total Courses', data.overallStats.totalCourses, new Date().toISOString()],
      ['Platform Stats', 'Total Lessons', data.overallStats.totalLessons, new Date().toISOString()],
      ['Platform Stats', 'Total Quizzes', data.overallStats.totalQuizzes, new Date().toISOString()],
      ['Platform Stats', 'Total Enrollments', data.overallStats.totalEnrollments, new Date().toISOString()],
      ['Platform Stats', 'Average Completion Rate', `${data.overallStats.averageCompletionRate}%`, new Date().toISOString()],
    ];

    return csvContent.map(row => row.join(',')).join('\n');
  }

  // For future PDF implementation
  return '';
}

export async function getDetailedUserEngagement(userId: string, timeRange: string) {
  const now = new Date();
  let fromDate = new Date();
  
  switch (timeRange) {
    case 'last7days':
      fromDate.setDate(now.getDate() - 7);
      break;
    case 'last30days':
      fromDate.setDate(now.getDate() - 30);
      break;
    case 'last90days':
      fromDate.setDate(now.getDate() - 90);
      break;
    default:
      fromDate = new Date(0); // All time
  }

  const { data: userActivity, error: activityError } = await supabase
    .from('user_activity_log')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', fromDate.toISOString());

  if (activityError) throw activityError;

  const { data: courseProgress, error: progressError } = await supabase
    .from('user_courses')
    .select(`
      *,
      courses (
        title,
        description
      )
    `)
    .eq('user_id', userId);

  if (progressError) throw progressError;

  const { data: quizResults, error: quizError } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quizzes (
        title,
        course_id
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', fromDate.toISOString());

  if (quizError) throw quizError;

  return {
    activity: userActivity,
    courseProgress,
    quizResults
  };
}

export async function generateEngagementInsights(userId: string, engagementData: any) {
  try {
    const prompt = `Analyze the following user engagement data and provide personalized insights:

Activity Log:
${JSON.stringify(engagementData.activity)}

Course Progress:
${JSON.stringify(engagementData.courseProgress)}

Quiz Results:
${JSON.stringify(engagementData.quizResults)}

Please provide:
1. Learning patterns and preferences
2. Strengths and areas for improvement
3. Personalized recommendations
4. Engagement level analysis
5. Success indicators
6. Risk factors (if any)
7. Suggested learning path adjustments

Format the response in clear sections with actionable recommendations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating engagement insights:', error);
    return 'Unable to generate engagement insights at this time.';
  }
} 