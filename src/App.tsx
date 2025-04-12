
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
import AdminCourseLessons from "./pages/AdminCourseLessons";
import AdminQuizzes from "./pages/AdminQuizzes";
import AdminQuizQuestions from "./pages/AdminQuizQuestions";
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
            
            {/* Protected routes with role-based access */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Learning paths and courses */}
            <Route path="/my-learning" element={
              <ProtectedRoute>
                <Layout>
                  <LearningPath />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/courses" element={
              <ProtectedRoute>
                <Layout>
                  <Courses />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Quiz taking routes */}
            <Route path="/courses/:courseId/quizzes/:quizId" element={
              <ProtectedRoute>
                <TakeQuiz />
              </ProtectedRoute>
            } />
            
            <Route path="/courses/:courseId/lessons/:lessonId/quizzes/:quizId" element={
              <ProtectedRoute>
                <TakeQuiz />
              </ProtectedRoute>
            } />
            
            {/* Onboarding - protected but doesn't require completed onboarding */}
            <Route path="/onboarding" element={
              <ProtectedRoute requireOnboarding={false}>
                <Onboarding />
              </ProtectedRoute>
            } />
            
            {/* Admin routes - strictly enforced for admin role only */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/courses" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminCourseManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/admin/courses/:courseId/lessons" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminCourseLessons />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Admin Quiz Management Routes */}
            <Route path="/admin/courses/:courseId/quizzes" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminQuizzes />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/courses/:courseId/lessons/:lessonId/quizzes" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminQuizzes />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/courses/:courseId/quizzes/:quizId/questions" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminQuizQuestions />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/admin/learning-paths" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminLearningPaths />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Fix duplicate routes with different components by consolidating them */}
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Navigate to="/admin?tab=users" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Navigate to="/admin?tab=settings" replace />
              </ProtectedRoute>
            } />
            
            {/* Management routes - for managers and admins */}
            <Route path="/team" element={
              <ProtectedRoute requiredRoles={['admin', 'manager']}>
                <Layout requiredRoles={['admin', 'manager']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Team Management</h1>
                    <p>This page is restricted to managers and admins.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute requiredRoles={['admin', 'manager']}>
                <Layout requiredRoles={['admin', 'manager']}>
                  <div className="container py-6">
                    <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
                    <p>This page is restricted to managers and admins.</p>
                  </div>
                </Layout>
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
