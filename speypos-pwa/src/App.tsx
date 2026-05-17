import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MenuProvider } from "@/contexts/MenuContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PendingActionsProvider } from "@/contexts/PendingActionsContext";
import { SetupProvider } from "@/contexts/SetupContext";
import { isAndroidWebViewBuild } from "@/lib/runtime-config";
import { useTranslation } from "@/lib/i18n";
import { useEffect } from "react";

// POS Pages
import ShiftPage from "./pages/pos/ShiftPage";
import OrderPage from "./pages/pos/OrderPage";
import PaymentPage from "./pages/pos/PaymentPage";
import CompletePage from "./pages/pos/CompletePage";

// Display Page
import DisplayPage from "./pages/display/DisplayPage";

// Admin Pages
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layouts/AdminLayout";
import { StaffManagement } from "./components/admin/StaffManagement";
import { MenuItemManagement } from "./components/admin/MenuItemManagement";
import { CategoryManagement } from "./components/admin/CategoryManagement";
import { CustomizationManagement } from "./components/admin/CustomizationManagement";
import { ToppingManagement } from "./components/admin/ToppingManagement";
import { OrderHistoryManagement } from "./components/admin/OrderHistoryManagement";
import { StoreManagement } from "./components/admin/StoreManagement";
import { SettingsManagement } from "./components/admin/SettingsManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const Router = isAndroidWebViewBuild() ? HashRouter : BrowserRouter;

const AppContent = () => {
  const { language } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <Router>
      <MenuProvider>
        <ShiftProvider>
          <Routes>
            {/* Redirect root to POS shift page */}
            <Route path="/" element={<Navigate to="/pos/shift" replace />} />

            {/* Setup route - redirects if already initialized (setup gated by SetupProvider) */}
            <Route path="/setup" element={<Navigate to="/" replace />} />

            {/* POS Routes */}
            <Route path="/pos/shift" element={<ShiftPage />} />
            <Route path="/pos/order" element={<OrderPage />} />
            <Route path="/pos/payment" element={<PaymentPage />} />
            <Route path="/pos/complete" element={<CompletePage />} />

            {/* Customer Display Route (independent, read-only) */}
            <Route path="/display" element={<DisplayPage />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/staff" replace />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="menu-items" element={<MenuItemManagement />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="customizations" element={<CustomizationManagement />} />
              <Route path="toppings" element={<ToppingManagement />} />
              <Route path="order-history" element={<OrderHistoryManagement />} />
              <Route path="store" element={<StoreManagement />} />
              <Route path="settings" element={<SettingsManagement />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ShiftProvider>
      </MenuProvider>
    </Router>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <SetupProvider>
        <AuthProvider>
          <PendingActionsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </PendingActionsProvider>
        </AuthProvider>
      </SetupProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
