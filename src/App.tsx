import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { isNativePlatform } from "@/hooks/usePlatform";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderApprovedShifts from "./pages/ProviderApprovedShifts";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Booking from "./pages/Booking";
import Notifications from "./pages/Notifications";
import ClientNotifications from "./pages/ClientNotifications";
import ProviderNotifications from "./pages/ProviderNotifications";
import AdminNotifications from "./pages/AdminNotifications";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import AdminApplications from "./pages/AdminApplications";
import AdminApprovedApplications from "./pages/AdminApprovedApplications";
import AdminDeletedShifts from "./pages/AdminDeletedShifts";
import AdminApprovedShifts from "./pages/AdminApprovedShifts";

import ProviderLogin from "./pages/ProviderLogin";
import ClientLogin from "./pages/ClientLogin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const isNative = isNativePlatform();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/provider-dashboard" element={<ProviderDashboard />} />
            <Route path="/jobs" element={<ProviderDashboard />} />
            <Route path="/approved-shifts" element={<ProviderApprovedShifts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/client-notifications" element={<ClientNotifications />} />
            <Route path="/provider-notifications" element={<ProviderNotifications />} />
            <Route path="/register" element={<Register />} />
            <Route path="/provider-login" element={<ProviderLogin />} />
            <Route path="/client-login" element={<ClientLogin />} />
            {!isNative && (
              <>
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/admin/applications" element={<AdminApplications />} />
                <Route path="/admin/approved" element={<AdminApprovedApplications />} />
                <Route path="/admin/deleted-shifts" element={<AdminDeletedShifts />} />
                <Route path="/admin/approved-shifts" element={<AdminApprovedShifts />} />
                
                <Route path="/admin/notifications" element={<AdminNotifications />} />
              </>
            )}
            <Route path="/chat" element={<Dashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
