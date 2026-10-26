import { LayoutDashboard, Users, Megaphone, ShieldAlert, ScrollText, Home } from "lucide-react";
import Shell from "./Shell";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
  const { user } = useAuth();
  const appHome = user?.accountType === "BROKER" ? "/broker" : "/app";
  return (
    <Shell
      brandTagline="QISMA — لوحة الأدمن"
      homePath="/admin"
      profilePath="/admin/profile"
      navItems={[
        { to: "/admin", end: true, icon: <LayoutDashboard className="h-4 w-4" />, label: "نظرة عامة" },
        { to: "/admin/users", icon: <Users className="h-4 w-4" />, label: "الحسابات" },
        { to: "/admin/announcements", icon: <Megaphone className="h-4 w-4" />, label: "التعاميم" },
        { to: "/admin/security", icon: <ShieldAlert className="h-4 w-4" />, label: "الأمان والمنصة" },
        { to: "/admin/audit", icon: <ScrollText className="h-4 w-4" />, label: "سجل العمليات" },
        { to: appHome, icon: <Home className="h-4 w-4" />, label: "العودة للتطبيق" },
      ]}
    />
  );
}
