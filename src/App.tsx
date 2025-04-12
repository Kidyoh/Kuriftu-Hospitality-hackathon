
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
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              {/* Add more protected routes here */}
            </Route>
            
            {/* Onboarding - protected but doesn't require completed onboarding */}
            <Route element={<ProtectedRoute requireOnboarding={false} />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>
            
            {/* Role-based routes */}
            <Route element={<ProtectedRoute requiredRoles={['admin', 'manager']} />}>
              {/* Admin and manager only routes go here */}
              <Route path="/admin/users" element={<Dashboard />} />
              <Route path="/admin/learning-paths" element={<Dashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute requiredRoles={['admin']} />}>
              {/* Admin only routes go here */}
              <Route path="/admin/settings" element={<Dashboard />} />
            </Route>
            
            {/* Redirect from legacy routes */}
            <Route path="/index" element={<Navigate to="/dashboard" />} />
            
            {/* Fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
