import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, AlertTriangle, Users } from "lucide-react";
import { propertiesApi } from "../../api/client";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { roleLabel } from "../../lib/status";
import { formatMoney } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertySummary } from "../../types";

export default function PropertiesListPage() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState<PropertySummary[] | null>(null);

  useEffect(() => {
    propertiesApi.list().then(setProperties);
  }, []);

  if (!properties) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-800">{t("العقارات")}</h1>
        <Link to="/app/properties/new" className="btn-brass">
          <Plus className="h-4 w-4" />
          {t("عقار جديد")}
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={t("لا توجد عقارات بعد")}
          description={t("أنشئ أول عقار مشترك وحدد نسب الملكية بين الشركاء.")}
          action={
            <Link to="/app/properties/new" className="btn-brass">
              <Plus className="h-4 w-4" />
              {t("إنشاء عقار")}
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("العقار")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("دوري")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("الشركاء")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("القيمة التقديرية")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("اعتراضات مفتوحة")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {properties.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-parchment-50">
                  <td className="px-4 py-3">
                    <Link to={`/app/properties/${p.id}`} className="font-medium text-ink-800 hover:text-brass-600">
                      {p.name}
                    </Link>
                    {p.address && <p className="text-xs text-ink-400">{p.address}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={t(roleLabel[p.myRole])} tone="neutral" />
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-ink-300" />
                      {p.partnersCount}
                    </span>
                  </td>
                  <td className="num px-4 py-3 text-ink-600">{formatMoney(p.estimatedValue)}</td>
                  <td className="px-4 py-3">
                    {p.openDisputes > 0 ? (
                      <span className="inline-flex items-center gap-1 text-clay-500">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {p.openDisputes}
                      </span>
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
  );
}
