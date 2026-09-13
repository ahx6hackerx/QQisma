import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Lock, Wallet, CircleDollarSign, CheckCircle2 } from "lucide-react";
import { closingApi, distributionsApi } from "../../api/client";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Stat } from "../../components/ui/Stat";
import { EmptyState } from "../../components/ui/EmptyState";
import { closingStatusLabel, distributionStatus } from "../../lib/status";
import { formatMoney, monthLabel } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { Distribution, MonthlyClosing } from "../../types";

interface ClosingPreview {
  periodYear: number;
  periodMonth: number;
  reportedIncome: number;
  verifiedIncome: number;
  unverifiedIncome: number;
  reportedExpenses: number;
  verifiedExpenses: number;
  unverifiedExpenses: number;
  netVerifiedIncome: number;
  openDisputes: number;
  alreadyClosed?: boolean;
}

export default function ClosingPage() {
  const { myRole } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t, language } = useLanguage();
  const now = new Date();

  const [tab, setTab] = useState<"closing" | "distributions" | "myshare">("closing");
  const [closings, setClosings] = useState<MonthlyClosing[] | null>(null);
  const [preview, setPreview] = useState<ClosingPreview | null>(null);
  const [distributions, setDistributions] = useState<Distribution[] | null>(null);
  const [myShare, setMyShare] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const canClose = ["OWNER", "MANAGER"].includes(myRole);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  function load() {
    if (!propertyId) return;
    closingApi.list(propertyId).then(setClosings);
    closingApi.preview(propertyId, year, month).then((data) => setPreview(data.alreadyClosed ? { ...data.closing, alreadyClosed: true } : { ...data.preview, alreadyClosed: false }));
    distributionsApi.list(propertyId).then(setDistributions);
    distributionsApi.myShare(propertyId).then(setMyShare);
  }

  useEffect(load, [propertyId]);

  async function handleClose(force = false) {
    if (!propertyId) return;
    setError(null);
    setClosing(true);
    try {
      await closingApi.close(propertyId, { year, month, force });
      load();
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("اعتراض") && !force) {
        if (confirm(`${message}\n\n${t("هل تريد إقفال الشهر رغم ذلك؟")}`)) {
          await handleClose(true);
          return;
        }
      }
      setError(message);
    } finally {
      setClosing(false);
    }
  }

  async function handleCreateDistribution(monthlyClosingId: string) {
    if (!propertyId) return;
    setError(null);
    try {
      await distributionsApi.create(propertyId, monthlyClosingId);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePay(distributionId: string, itemId: string) {
    if (!propertyId) return;
    await distributionsApi.payItem(propertyId, distributionId, itemId);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-md bg-ink-100 p-1 w-fit">
        {[
          { key: "closing", label: t("الإقفال الشهري") },
          { key: "distributions", label: t("التوزيعات") },
          { key: "myshare", label: t("حصتي") },
        ].map((tab2) => (
          <button
            key={tab2.key}
            onClick={() => setTab(tab2.key as typeof tab)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === tab2.key ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
          >
            {tab2.label}
          </button>
        ))}
      </div>

      <ErrorText message={error} />

      {tab === "closing" && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink-800">
                {t(monthLabel(month))} {year} {preview?.alreadyClosed && `(${t("مُقفل")})`}
              </h2>
              {canClose && !preview?.alreadyClosed && (
                <button onClick={() => handleClose(false)} className="btn-brass text-sm" disabled={closing}>
                  <Lock className="h-4 w-4" />
                  {t("إقفال الشهر")}
                </button>
              )}
            </div>
            {preview && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label={t("إيراد مُدخل")} value={formatMoney(preview.reportedIncome)} />
                <Stat label={t("إيراد موثّق")} value={formatMoney(preview.verifiedIncome)} tone="sage" />
                <Stat label={t("مصروف مُدخل")} value={formatMoney(preview.reportedExpenses)} />
                <Stat label={t("مصروف موثّق")} value={formatMoney(preview.verifiedExpenses)} tone="sage" />
                <Stat label={t("صافي الدخل الموثّق")} value={formatMoney(preview.netVerifiedIncome)} tone="brass" />
                <Stat label={t("اعتراضات مفتوحة")} value={preview.openDisputes} tone={preview.openDisputes > 0 ? "clay" : "default"} />
              </div>
            )}
          </div>

          <h3 className="mb-2 font-display text-sm font-semibold text-ink-600">{t("سجل الإقفالات السابقة")}</h3>
          {closings?.length === 0 ? (
            <EmptyState title={t("لا توجد إقفالات سابقة")} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-parchment-200 text-xs text-ink-500">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">{t("الشهر")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("صافي الدخل الموثّق")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("الحالة")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("التوزيع")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {closings?.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-ink-800">
                        {t(monthLabel(c.periodMonth))} {c.periodYear}
                      </td>
                      <td className="num px-4 py-3 font-semibold text-ink-700">{formatMoney(c.netVerifiedIncome)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={t(closingStatusLabel[c.status].label)} tone={closingStatusLabel[c.status].tone} />
                      </td>
                      <td className="px-4 py-3">
                        {c.distribution ? (
                          <StatusBadge label={t(distributionStatus[c.distribution.status].label)} tone={distributionStatus[c.distribution.status].tone} />
                        ) : c.status === "CLOSED" && canClose && c.netVerifiedIncome > 0 ? (
                          <button onClick={() => handleCreateDistribution(c.id)} className="btn-outline text-xs">
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            {t("إنشاء توزيع")}
                          </button>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "distributions" && (
        <div className="space-y-4">
          {distributions?.length === 0 ? (
            <EmptyState icon={<CircleDollarSign className="h-8 w-8" />} title={t("لا توجد توزيعات بعد")} />
          ) : (
            distributions?.map((d) => (
              <div key={d.id} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium text-ink-800">
                    {d.monthlyClosing && `${t(monthLabel(d.monthlyClosing.periodMonth))} ${d.monthlyClosing.periodYear}`} —{" "}
                    <span className="num">{formatMoney(d.netIncome)}</span>
                  </p>
                  <StatusBadge label={t(distributionStatus[d.status].label)} tone={distributionStatus[d.status].tone} />
                </div>
                <div className="divide-y divide-ink-100">
                  {d.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-ink-700">
                        {item.user.fullName} <span className="text-ink-400">({item.sharePercent}%)</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="num font-semibold text-ink-700">{formatMoney(item.amount)}</span>
                        {item.paid ? (
                          <StatusBadge label={t("مدفوع")} tone="sage" />
                        ) : canClose ? (
                          <button onClick={() => handlePay(d.id, item.id)} className="btn-outline text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("تسجيل الدفع")}
                          </button>
                        ) : (
                          <StatusBadge label={t("بانتظار الدفع")} tone="neutral" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "myshare" && myShare && <MyShareView data={myShare} />}
    </div>
  );
}

function MyShareView({ data }: { data: any }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t("نسبة ملكيتي")} value={`${data.sharePercent}%`} icon={<Wallet className="h-4 w-4" />} />
        <Stat label={t("قيمة حصتي من العقار")} value={formatMoney(data.shareValue)} />
        <Stat label={t("المستلم")} value={formatMoney(data.receivedTotal)} tone="sage" />
        <Stat label={t("المتبقي")} value={formatMoney(data.pendingTotal)} tone="brass" />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 font-display text-base font-semibold text-ink-800">{t("توزيعاتي")}</h3>
        {data.distributions.length === 0 ? (
          <p className="text-sm text-ink-400">{t("لا توجد توزيعات بعد.")}</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.distributions.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-600">{d.period}</span>
                <div className="flex items-center gap-3">
                  <span className="num font-semibold text-ink-800">{formatMoney(d.amount)}</span>
                  <StatusBadge label={d.paid ? t("مستلم") : t("قيد الانتظار")} tone={d.paid ? "sage" : "neutral"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
