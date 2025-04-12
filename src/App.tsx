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
            
            {/* Default route redirect */}
            <Route path="/index" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected routes with standard access */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
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

            <Route path="/admin/learning-paths" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout requiredRoles={['admin']}>
                  <AdminLearningPaths />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Consolidated admin routes */}
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
            
            {/* Fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
