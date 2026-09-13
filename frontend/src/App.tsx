import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PageSpinner } from "./components/ui/Spinner";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import PublicConfirmPage from "./pages/PublicConfirmPage";

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

import BrokerLayout from "./components/layout/BrokerLayout";
import BrokerDashboardPage from "./pages/broker/BrokerDashboardPage";
import ListingsPage from "./pages/broker/ListingsPage";
import LeadsPage from "./pages/broker/LeadsPage";

function ProtectedRoute({ children, requireAccountType }: { children: JSX.Element; requireAccountType?: "OWNER" | "BROKER" }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
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
      <Route path="/confirm/:id" element={<PublicConfirmPage />} />

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

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.accountType === "BROKER" ? "/broker" : "/app"} replace />;
}
