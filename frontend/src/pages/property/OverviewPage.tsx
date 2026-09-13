import { useEffect, useState } from "react";
import { useOutletContext, useParams, Link } from "react-router-dom";
import { AlertTriangle, Vote, FileWarning, TrendingUp, TrendingDown } from "lucide-react";
import { financeApi, reportsApi } from "../../api/client";
import { Stat } from "../../components/ui/Stat";
import { formatMoney, monthLabel } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { ActivityItem } from "../../types";

export default function OverviewPage() {
  const { ownership, stats } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t, language } = useLanguage();
  const [moneyFlow, setMoneyFlow] = useState<{ income: number; expense: number; net: number } | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);

  const now = new Date();

  useEffect(() => {
    if (!propertyId) return;
    financeApi.whereDidTheMoneyGo(propertyId, now.getFullYear(), now.getMonth() + 1).then(setMoneyFlow);
    reportsApi.activity(propertyId).then((items) => setActivity(items.slice(0, 6)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label={t("عمليات غير موثقة")}
          value={stats.unverifiedCount}
          tone={stats.unverifiedCount > 0 ? "brass" : "default"}
          icon={<FileWarning className="h-4 w-4" />}
        />
        <Stat
          label={t("اعتراضات مفتوحة")}
          value={stats.openDisputes}
          tone={stats.openDisputes > 0 ? "clay" : "default"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Stat
          label={t("قرارات قيد التصويت")}
          value={stats.pendingDecisions}
          tone={stats.pendingDecisions > 0 ? "brass" : "default"}
          icon={<Vote className="h-4 w-4" />}
        />
        <Stat label={t("عدد الشركاء")} value={ownership.length} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-ink-800">{t("هيكل الملكية")}</h2>
          <div className="space-y-3">
            {ownership.map((o) => (
              <div key={o.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{o.user.fullName}</span>
                  <span className="num font-semibold text-ink-700">{o.sharePercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brass-400" style={{ width: `${o.sharePercent}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Link to={`/app/properties/${propertyId}/ownership`} className="mt-4 inline-block text-sm font-medium text-brass-600 hover:underline">
            {language === "ar" ? "عرض تفاصيل الملكية والشركاء ←" : "View ownership & partner details →"}
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-ink-800">{t("أين ذهبت الأموال؟")}</h2>
          <p className="mb-4 text-xs text-ink-400">
            {t(monthLabel(now.getMonth() + 1))} {now.getFullYear()}
          </p>
          {moneyFlow && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-sage-50 p-3">
                <p className="flex items-center gap-1 text-xs text-sage-600">
                  <TrendingUp className="h-3.5 w-3.5" /> {t("الدخل")}
                </p>
                <p className="num mt-1 text-lg font-bold text-sage-600">{formatMoney(moneyFlow.income)}</p>
              </div>
              <div className="rounded-md bg-clay-50 p-3">
                <p className="flex items-center gap-1 text-xs text-clay-500">
                  <TrendingDown className="h-3.5 w-3.5" /> {t("المصاريف")}
                </p>
                <p className="num mt-1 text-lg font-bold text-clay-500">{formatMoney(moneyFlow.expense)}</p>
              </div>
              <div className="rounded-md bg-ink-50 p-3">
                <p className="text-xs text-ink-500">{t("الصافي")}</p>
                <p className="num mt-1 text-lg font-bold text-ink-800">{formatMoney(moneyFlow.net)}</p>
              </div>
            </div>
          )}
          <Link to={`/app/properties/${propertyId}/finance`} className="mt-4 inline-block text-sm font-medium text-brass-600 hover:underline">
            {language === "ar" ? "عرض السجل المالي الكامل ←" : "View the full financial ledger →"}
          </Link>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink-800">{t("آخر النشاطات")}</h2>
          <Link to={`/app/properties/${propertyId}/activity`} className="text-sm font-medium text-brass-600 hover:underline">
            {language === "ar" ? "عرض الكل ←" : "View all →"}
          </Link>
        </div>
        <div className="space-y-3">
          {activity?.length === 0 && <p className="text-sm text-ink-400">{t("لا يوجد نشاط بعد.")}</p>}
          {activity?.map((a) => (
            <div key={a.id} className="flex items-start gap-3 text-sm">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-400" />
              <div>
                <p className="text-ink-700">
                  <span className="font-medium">{a.actorName}</span> — {a.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
