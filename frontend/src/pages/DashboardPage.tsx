import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, AlertTriangle, Vote, Wallet, Plus } from "lucide-react";
import { dashboardApi } from "../api/client";
import { Stat } from "../components/ui/Stat";
import { PageSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { roleLabel } from "../lib/status";
import { formatMoney } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

interface DashboardData {
  portfolioValue: number;
  propertiesCount: number;
  openDisputes: number;
  pendingDecisions: number;
  properties: { id: string; name: string; myRole: string; sharePercent: number; shareValue: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    dashboardApi.get().then(setData);
  }, []);

  if (!data) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-800">
            {t("أهلًا")} {user?.fullName?.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-sm text-ink-400">{t("هذه صورة سريعة عن عقاراتك المشتركة.")}</p>
        </div>
        <Link to="/app/properties/new" className="btn-brass">
          <Plus className="h-4 w-4" />
          {t("عقار جديد")}
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t("قيمة حصتي من المحفظة")} value={formatMoney(data.portfolioValue)} icon={<Wallet className="h-4 w-4" />} />
        <Stat label={t("عدد العقارات")} value={data.propertiesCount} icon={<Building2 className="h-4 w-4" />} />
        <Stat
          label={t("اعتراضات مفتوحة")}
          value={data.openDisputes}
          tone={data.openDisputes > 0 ? "clay" : "default"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Stat
          label={t("قرارات بانتظار التصويت")}
          value={data.pendingDecisions}
          tone={data.pendingDecisions > 0 ? "brass" : "default"}
          icon={<Vote className="h-4 w-4" />}
        />
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink-800">{t("عقاراتي")}</h2>
      {data.properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={t("لا توجد عقارات بعد")}
          description={t("أنشئ أول عقار وابدأ بتوثيق الملكية والحسابات المشتركة.")}
          action={
            <Link to="/app/properties/new" className="btn-brass">
              <Plus className="h-4 w-4" />
              {t("إنشاء عقار")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.properties.map((p) => (
            <Link key={p.id} to={`/app/properties/${p.id}`} className="card block p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <p className="font-display text-base font-semibold text-ink-800">{p.name}</p>
                <StatusBadge label={t(roleLabel[p.myRole as keyof typeof roleLabel])} tone="neutral" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-ink-400">{t("نسبة ملكيتي")}</p>
                  <p className="num text-lg font-semibold text-ink-700">{p.sharePercent}%</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-ink-400">{t("قيمة حصتي")}</p>
                  <p className="num text-lg font-semibold text-brass-600">{formatMoney(p.shareValue)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
