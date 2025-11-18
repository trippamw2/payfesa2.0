import React, { useEffect, useState, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import BackToTop from "@/components/BackToTop";

// Landing Page Components
import Index from "./pages/Index";
import HowItWorks from "./pages/HowItWorks";
import HelpCentre from "./pages/HelpCentre";
import ContactUs from "./pages/ContactUs";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import About from "./pages/About";

// Auth Components
import Auth from "./pages/Auth";

// User App Components
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import Achievements from "./pages/Achievements";
import Leaderboard from "./pages/Leaderboard";
import MobileMoneyManagement from "./pages/MobileMoneyManagement";
import BankAccountManagement from "./pages/BankAccountManagement";
import PayoutManagement from "./pages/PayoutManagement";
import WalletManagement from "./pages/WalletManagement";
import TrustScoreHistory from "./pages/TrustScoreHistory";
import NotificationSettings from "./pages/NotificationSettings";
import CreditScore from "./pages/CreditScore";
import Settings from "./pages/Settings";

// Admin Components
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPayouts from "./pages/AdminPayouts";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminScheduledPayouts from "./pages/AdminScheduledPayouts";
import AdminPaychanguSettings from "./pages/AdminPaychanguSettings";
import AdminMarketing from "./pages/AdminMarketing";
import AdminFinance from "./pages/AdminFinance";
import AdminOperations from "./pages/AdminOperations";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminReserveWallet from "./pages/AdminReserveWallet";
import AdminDisputes from "./pages/AdminDisputes";
import DisputeManagement from "./pages/DisputeManagement";
import InstantPayout from "./pages/InstantPayout";
import AccountSettings from "./pages/AccountSettings";
import SecuritySettings from "./pages/SecuritySettings";
import PaymentSettings from "./pages/PaymentSettings";
import PushNotificationSettings from "./pages/PushNotificationSettings";
import { ShareListener } from "./components/dashboard/ShareListener";



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnReconnect: false, // Disable refetch on reconnect
      retry: 1, // Only retry once on failure
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const AppContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <>
      <ShareListener />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Index />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/help" element={<HelpCentre />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about" element={<About />} />
        
        {/* Auth Route */}
        <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
        
        {/* Protected User Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/mobile-money" element={<ProtectedRoute><MobileMoneyManagement /></ProtectedRoute>} />
        <Route path="/bank-accounts" element={<ProtectedRoute><BankAccountManagement /></ProtectedRoute>} />
        <Route path="/payouts" element={<ProtectedRoute><PayoutManagement /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletManagement /></ProtectedRoute>} />
        <Route path="/trust-score" element={<ProtectedRoute><TrustScoreHistory /></ProtectedRoute>} />
        <Route path="/trust-score-history" element={<ProtectedRoute><TrustScoreHistory /></ProtectedRoute>} />
        <Route path="/credit-score" element={<ProtectedRoute><CreditScore /></ProtectedRoute>} />
        <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
        <Route path="/settings/payment" element={<ProtectedRoute><PaymentSettings /></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><PushNotificationSettings /></ProtectedRoute>} />
        <Route path="/instant-payout" element={<ProtectedRoute><InstantPayout /></ProtectedRoute>} />
        <Route path="/disputes" element={<ProtectedRoute><DisputeManagement /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/marketing" element={<ProtectedRoute><AdminMarketing /></ProtectedRoute>} />
        <Route path="/admin/finance" element={<ProtectedRoute><AdminFinance /></ProtectedRoute>} />
        <Route path="/admin/reserve" element={<ProtectedRoute><AdminReserveWallet /></ProtectedRoute>} />
        <Route path="/admin/operations" element={<ProtectedRoute><AdminOperations /></ProtectedRoute>} />
        <Route path="/admin/payouts" element={<ProtectedRoute><AdminPayouts /></ProtectedRoute>} />
        <Route path="/admin/scheduled-payouts" element={<ProtectedRoute><AdminScheduledPayouts /></ProtectedRoute>} />
        <Route path="/admin/campaigns" element={<ProtectedRoute><AdminCampaigns /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUserManagement /></ProtectedRoute>} />
        <Route path="/admin/paychangu-settings" element={<ProtectedRoute><AdminPaychanguSettings /></ProtectedRoute>} />
        <Route path="/admin/api-settings" element={<ProtectedRoute><AdminPaychanguSettings /></ProtectedRoute>} />
        <Route path="/admin/disputes" element={<ProtectedRoute><AdminDisputes /></ProtectedRoute>} />
        
        {/* Catch-all redirect based on auth status */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<LoadingFallback />}>
                  <AppContent />
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

export default App;
