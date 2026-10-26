import { LayoutDashboard, Building2, Bell, ShieldCheck } from "lucide-react";
import Shell from "./Shell";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();
  return (
    <Shell
      brandTagline={t("QISMA — سجل العقار المشترك")}
      homePath="/app"
      profilePath="/app/profile"
      notificationsPath="/app/notifications"
      navItems={[
        { to: "/app", end: true, icon: <LayoutDashboard className="h-4 w-4" />, label: t("لوحة التحكم") },
        { to: "/app/properties", icon: <Building2 className="h-4 w-4" />, label: t("العقارات") },
        { to: "/app/notifications", icon: <Bell className="h-4 w-4" />, label: t("الإشعارات") },
        ...(user?.isAdmin ? [{ to: "/admin", icon: <ShieldCheck className="h-4 w-4" />, label: "لوحة الأدمن" }] : []),
      ]}
    />
  );
}
