import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PageSpinner } from "./components/ui/Spinner";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import PublicConfirmPage from "./pages/PublicConfirmPage";
import TenantPortalPage from "./pages/TenantPortalPage";

import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import PropertiesListPage from "./pages/properties/PropertiesListPage";
import CreatePropertyPage from "./pages/properties/CreatePropertyPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";

import PropertyLayout from "./components/layout/PropertyLayout";
import OverviewPage from "./pages/property/OverviewPage";
import OwnershipPage from "./pages/property/OwnershipPage";
import FinancePage from "./pages/property/FinancePage";
import EvidencePage from "./pages/property/EvidencePage";
import DisputesPage from "./pages/property/DisputesPage";
import ClosingPage from "./pages/property/ClosingPage";
import DecisionsPage from "./pages/property/DecisionsPage";
import DocumentsPage from "./pages/property/DocumentsPage";
import ReportsPage from "./pages/property/ReportsPage";
import ActivityPage from "./pages/property/ActivityPage";
import TenantsMaintenancePage from "./pages/property/TenantsMaintenancePage";

import BrokerLayout from "./components/layout/BrokerLayout";
import BrokerDashboardPage from "./pages/broker/BrokerDashboardPage";
import ListingsPage from "./pages/broker/ListingsPage";
import LeadsPage from "./pages/broker/LeadsPage";

import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import AdminAnnouncementsPage from "./pages/admin/AdminAnnouncementsPage";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";

function ProtectedRoute({
  children,
  requireAccountType,
  requireAdmin,
}: {
  children: React.ReactElement;
  requireAccountType?: "OWNER" | "BROKER";
  requireAdmin?: boolean;
}) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  // Admin area: non-admins are sent to their own home (the server also
  // enforces this — this is just so they don't see an empty page).
  if (requireAdmin && !user.isAdmin) {
    return <Navigate to={user.accountType === "BROKER" ? "/broker" : "/app"} replace />;
  }
  // Each account type has its own home area; visiting the other one
  // redirects to your own instead of a confusing empty/forbidden page.
  if (requireAccountType && user.accountType !== requireAccountType) {
    return <Navigate to={user.accountType === "BROKER" ? "/broker" : "/app"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/confirm/:id" element={<PublicConfirmPage />} />
      <Route path="/tenant/:token" element={<TenantPortalPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute requireAccountType="OWNER">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="properties" element={<PropertiesListPage />} />
        <Route path="properties/new" element={<CreatePropertyPage />} />

        <Route path="properties/:propertyId" element={<PropertyLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="ownership" element={<OwnershipPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="disputes" element={<DisputesPage />} />
          <Route path="closing" element={<ClosingPage />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="tenants" element={<TenantsMaintenancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="activity" element={<ActivityPage />} />
        </Route>
      </Route>

      <Route
        path="/broker"
        element={
          <ProtectedRoute requireAccountType="BROKER">
            <BrokerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BrokerDashboardPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to={user.accountType === "BROKER" ? "/broker" : "/app"} replace />;
}
