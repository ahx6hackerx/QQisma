import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { reportsApi, propertiesApi } from "../../api/client";
import { Stat } from "../../components/ui/Stat";
import { formatMoney, monthLabel } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { PropertyMember } from "../../types";
import { useAuth } from "../../context/AuthContext";

export default function ReportsPage() {
  const { myRole } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<any>(null);

  const [partners, setPartners] = useState<PropertyMember[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>(user?.id ?? "");
  const [partnerReport, setPartnerReport] = useState<any>(null);

  const canViewOthers = ["OWNER", "MANAGER"].includes(myRole);

  useEffect(() => {
    if (propertyId) reportsApi.monthly(propertyId, year, month).then(setReport);
  }, [propertyId, year, month]);

  useEffect(() => {
    if (propertyId) propertiesApi.partners(propertyId).then(setPartners);
  }, [propertyId]);

  useEffect(() => {
    if (propertyId && selectedPartner) reportsApi.partner(propertyId, selectedPartner).then(setPartnerReport);
  }, [propertyId, selectedPartner]);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display text-base font-semibold text-ink-800">{t("التقرير الشهري")}</h2>
          <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {t(monthLabel(m))}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {report && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label={t("عدد العمليات")} value={report.transactionsCount} />
              <Stat label={t("اعتراضات")} value={report.disputesCount} />
              <Stat label={t("قرارات")} value={report.decisionsCount} />
              <Stat
                label={t("صافي الدخل الموثّق")}
                value={report.closing ? formatMoney(report.closing.netVerifiedIncome) : t("لم يُقفل بعد")}
                tone="brass"
              />
            </div>

            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-parchment-200 text-xs text-ink-500">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">{t("التصنيف")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("النوع")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("الإجمالي")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("الموثّق")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {report.breakdown.map((b: any) => (
                    <tr key={b.category}>
                      <td className="px-4 py-3 text-ink-800">{t(b.category)}</td>
                      <td className="px-4 py-3 text-ink-500">{b.type === "INCOME" ? t("إيراد") : t("مصروف")}</td>
                      <td className="num px-4 py-3 text-ink-700">{formatMoney(b.total)}</td>
                      <td className="num px-4 py-3 text-sage-600">{formatMoney(b.verified)}</td>
                    </tr>
                  ))}
                  {report.breakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-ink-400">
                        {t("لا توجد عمليات لهذا الشهر.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display text-base font-semibold text-ink-800">{t("تقرير الشريك")}</h2>
          {canViewOthers && (
            <select className="input w-auto" value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)}>
              {partners.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.user.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
        {partnerReport && (
          <div className="grid grid-cols-3 gap-4">
            <Stat label={t("نسبة الملكية")} value={`${partnerReport.sharePercent}%`} />
            <Stat label={t("إجمالي المستلم")} value={formatMoney(partnerReport.totalReceived)} tone="sage" />
            <Stat label={t("إجمالي المتبقي")} value={formatMoney(partnerReport.totalPending)} tone="brass" />
          </div>
        )}
      </div>
    </div>
  );
}
