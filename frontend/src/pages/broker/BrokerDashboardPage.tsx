import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, TrendingUp, Plus, Clock, AlertCircle } from "lucide-react";
import { brokerApi } from "../../api/client";
import { Stat } from "../../components/ui/Stat";
import { PageSpinner } from "../../components/ui/Spinner";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { LEAD_STATUS_LABELS } from "./leadStatus";
import { formatDateShort } from "../../lib/format";

interface DashboardData {
  totalListings: number;
  availableListings: number;
  totalLeads: number;
  activeLeads: number;
  recentLeads: { id: string; fullName: string; status: string; createdAt: string; listing?: { title: string } | null }[];
  dueFollowUps: { id: string; fullName: string; status: string; nextFollowUpAt: string; listing?: { title: string } | null }[];
}

export default function BrokerDashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    brokerApi.dashboard().then(setData);
  }, []);

  if (!data) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-800">
            {language === "ar" ? "أهلًا" : "Welcome,"} {user?.fullName?.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {language === "ar" ? "هذه صورة سريعة عن نشاطك العقاري." : "Here's a quick snapshot of your brokerage activity."}
          </p>
        </div>
        <Link to="/broker/listings" className="btn-brass">
          <Plus className="h-4 w-4" />
          {language === "ar" ? "إعلان جديد" : "New listing"}
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={language === "ar" ? "إجمالي الإعلانات" : "Total listings"} value={data.totalListings} icon={<Building2 className="h-4 w-4" />} />
        <Stat label={language === "ar" ? "إعلانات متاحة" : "Available listings"} value={data.availableListings} tone="sage" />
        <Stat label={language === "ar" ? "إجمالي العملاء المحتملين" : "Total leads"} value={data.totalLeads} icon={<Users className="h-4 w-4" />} />
        <Stat label={language === "ar" ? "متابعات نشطة" : "Active follow-ups"} value={data.activeLeads} tone="brass" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-clay-500" />
          <h2 className="font-display text-base font-semibold text-ink-800">
            {language === "ar" ? "متابعات مستحقة" : "Follow-ups due"}
          </h2>
        </div>
        {data.dueFollowUps.length === 0 ? (
          <p className="text-sm text-ink-400">
            {language === "ar" ? "لا توجد متابعات مستحقة الآن — كل شي منظّم." : "No follow-ups due right now — all caught up."}
          </p>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.dueFollowUps.map((lead) => {
              const s = LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS];
              return (
                <Link
                  key={lead.id}
                  to="/broker/leads"
                  className="flex items-center justify-between py-2.5 text-sm hover:bg-parchment-50"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-clay-500" />
                    <div>
                      <p className="font-medium text-ink-800">{lead.fullName}</p>
                      <p className="text-xs text-ink-400">
                        {lead.listing?.title ?? (language === "ar" ? "بدون إعلان محدد" : "No linked listing")} —{" "}
                        {formatDateShort(lead.nextFollowUpAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge label={language === "ar" ? s.ar : s.en} tone={s.tone} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink-800">
            {language === "ar" ? "آخر العملاء المحتملين" : "Recent leads"}
          </h2>
          <Link to="/broker/leads" className="text-sm font-medium text-brass-600 hover:underline">
            {language === "ar" ? "عرض الكل ←" : "View all →"}
          </Link>
        </div>
        {data.recentLeads.length === 0 ? (
          <p className="text-sm text-ink-400">{language === "ar" ? "لا يوجد عملاء محتملون بعد." : "No leads yet."}</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.recentLeads.map((lead) => {
              const s = LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS];
              return (
                <div key={lead.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-800">{lead.fullName}</p>
                    <p className="text-xs text-ink-400">
                      {lead.listing?.title ?? (language === "ar" ? "بدون إعلان محدد" : "No linked listing")} —{" "}
                      {formatDateShort(lead.createdAt)}
                    </p>
                  </div>
                  <StatusBadge label={language === "ar" ? s.ar : s.en} tone={s.tone} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
