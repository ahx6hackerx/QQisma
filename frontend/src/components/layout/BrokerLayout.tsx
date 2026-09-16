import { LayoutDashboard, Building2, Users } from "lucide-react";
import Shell from "./Shell";
import { useLanguage } from "../../context/LanguageContext";

export default function BrokerLayout() {
  const { language } = useLanguage();
  return (
    <Shell
      brandTagline={language === "ar" ? "QISMA — منصة الوسطاء العقاريين" : "QISMA — Broker Workspace"}
      homePath="/broker"
      profilePath="/broker/profile"
      navItems={[
        {
          to: "/broker",
          end: true,
          icon: <LayoutDashboard className="h-4 w-4" />,
          label: language === "ar" ? "لوحة التحكم" : "Dashboard",
        },
        {
          to: "/broker/listings",
          icon: <Building2 className="h-4 w-4" />,
          label: language === "ar" ? "الإعلانات العقارية" : "Listings",
        },
        {
          to: "/broker/leads",
          icon: <Users className="h-4 w-4" />,
          label: language === "ar" ? "العملاء المحتملون" : "Leads",
        },
      ]}
    />
  );
}
