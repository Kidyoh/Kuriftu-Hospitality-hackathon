
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import { Layout } from "./components/layout/Layout";
import LearningPath from "./pages/LearningPath";
import Courses from "./pages/Courses";
import AdminCourseManagement from "./pages/AdminCourseManagement";
import AdminLearningPaths from "./pages/AdminLearningPaths";
import AdminQuizzes from "./pages/AdminQuizzes";
import AdminQuizQuestions from "./pages/AdminQuizQuestions";
import CourseLessons from "./pages/CourseLessons";
import TakeQuiz from "./pages/TakeQuiz";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with Layout */}
            <Route element={<ProtectedRoute />}>
              {/* Main dashboard */}
              <Route path="/dashboard" element={
                <Layout>
                  <Dashboard />
                </Layout>
              } />
              
              <Route path="/profile" element={
                <Layout>
                  <Profile />
                </Layout>
              } />
              
              {/* Learning routes */}
              <Route path="/my-learning" element={
                <Layout>
                  <LearningPath />
                </Layout>
              } />
              
              <Route path="/courses" element={
                <Layout>
                  <Courses />
                </Layout>
              } />
              
              <Route path="/courses/:courseId/lessons" element={
                <Layout>
                  <CourseLessons />
                </Layout>
              } />
              
              <Route path="/courses/:courseId/quizzes/:quizId" element={
                <Layout>
                  <TakeQuiz />
                </Layout>
              } />
              
              {/* Staff routes */}
              <Route path="/schedule" element={
                <Layout requiredRoles={['admin', 'manager', 'staff']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Staff Schedule</h1>
                    <p>This page is for scheduling staff shifts and activities.</p>
                  </div>
                </Layout>
              } />
              
              <Route path="/chat" element={
                <Layout requiredRoles={['admin', 'manager', 'staff']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Team Chat</h1>
                    <p>Team communication platform.</p>
                  </div>
                </Layout>
              } />
              
              <Route path="/break-room" element={
                <Layout requiredRoles={['admin', 'manager', 'staff']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Break Room</h1>
                    <p>Relax and socialize with your team.</p>
                  </div>
                </Layout>
              } />
              
              {/* Management routes */}
              <Route path="/team" element={
                <Layout requiredRoles={['admin', 'manager']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Team Management</h1>
                    <p>Manage your team members and performance.</p>
                  </div>
                </Layout>
              } />
              
              <Route path="/analytics" element={
                <Layout requiredRoles={['admin', 'manager']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
                    <p>View business and learning analytics.</p>
                  </div>
                </Layout>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <Layout requiredRoles={['admin']}>
                  <AdminDashboard />
                </Layout>
              } />
              
              <Route path="/admin/courses" element={
                <Layout requiredRoles={['admin']} showSidebar={false}>
                  <AdminCourseManagement />
                </Layout>
              } />
              
              <Route path="/admin/courses/:courseId/lessons" element={
                <Layout requiredRoles={['admin']} showSidebar={false}>
                  <CourseLessons />
                </Layout>
              } />
              
              <Route path="/admin/courses/:courseId/quizzes" element={
                <Layout requiredRoles={['admin']} showSidebar={false}>
                  <AdminQuizzes />
                </Layout>
              } />
              
              <Route path="/admin/courses/:courseId/quizzes/:quizId/questions" element={
                <Layout requiredRoles={['admin']} showSidebar={false}>
                  <AdminQuizQuestions />
                </Layout>
              } />
              
              <Route path="/admin/learning-paths" element={
                <Layout requiredRoles={['admin']} showSidebar={false}>
                  <AdminLearningPaths />
                </Layout>
              } />
              
              {/* Community pages */}
              <Route path="/achievements" element={
                <Layout>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Achievements</h1>
                    <p>View your learning achievements and badges.</p>
                  </div>
                </Layout>
              } />
              
              <Route path="/resources" element={
                <Layout>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Resources</h1>
                    <p>Access learning resources and materials.</p>
                  </div>
                </Layout>
              } />
              
              <Route path="/settings" element={
                <Layout>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Settings</h1>
                    <p>Manage your account settings and preferences.</p>
                  </div>
                </Layout>
              } />
              
              <Route path="/support" element={
                <Layout>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Help & Support</h1>
                    <p>Get help with using the learning platform.</p>
                  </div>
                </Layout>
              } />
            </Route>
            
            {/* Onboarding - protected but doesn't require completed onboarding */}
            <Route path="/onboarding" element={
              <ProtectedRoute requireOnboarding={false}>
                <Onboarding />
              </ProtectedRoute>
            } />
            
            {/* Fallback routes */}
            <Route path="/index" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
