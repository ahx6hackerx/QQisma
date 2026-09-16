import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { propertiesApi } from "../../api/client";
import { PageSpinner } from "../ui/Spinner";
import { StatusBadge } from "../ui/StatusBadge";
import { roleLabel } from "../../lib/status";
import { formatMoney } from "../../lib/format";
import { Tabs } from "../ui/Tabs";
import { useLanguage } from "../../context/LanguageContext";
import type { OwnershipRecord, Property, Role } from "../../types";

export interface PropertyContext {
  property: Property;
  myRole: Role;
  ownership: OwnershipRecord[];
  stats: { openDisputes: number; pendingDecisions: number; unverifiedCount: number };
  refresh: () => void;
}

export default function PropertyLayout() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t, language } = useLanguage();
  const [data, setData] = useState<PropertyContext | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!propertyId) return;
    propertiesApi.get(propertyId).then((res) => {
      setData({ property: res.property, myRole: res.myRole, ownership: res.ownership, stats: res.stats, refresh: load });
      setLoading(false);
    });
  }, [propertyId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading || !data) return <PageSpinner />;

  const { property, myRole } = data;

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-800">{property.name}</h1>
            {property.address && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-400">
                <MapPin className="h-3.5 w-3.5" />
                {property.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {property.estimatedValue && (
              <div className="text-left">
                <p className="text-xs text-ink-400">{t("القيمة التقديرية")}</p>
                <p className="num text-sm font-semibold text-ink-700">{formatMoney(property.estimatedValue)}</p>
              </div>
            )}
            <StatusBadge label={t(roleLabel[myRole])} tone="brass" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Tabs
          items={[
            { to: `/app/properties/${propertyId}`, label: t("نظرة عامة"), end: true },
            { to: `/app/properties/${propertyId}/ownership`, label: t("الملكية والشركاء") },
            { to: `/app/properties/${propertyId}/finance`, label: t("المالية") },
            { to: `/app/properties/${propertyId}/evidence`, label: t("الإثباتات") },
            { to: `/app/properties/${propertyId}/disputes`, label: t("الاعتراضات") },
            { to: `/app/properties/${propertyId}/closing`, label: t("الإقفال والتوزيع") },
            { to: `/app/properties/${propertyId}/decisions`, label: t("القرارات") },
            { to: `/app/properties/${propertyId}/documents`, label: t("المستندات") },
            { to: `/app/properties/${propertyId}/tenants`, label: language === "ar" ? "المستأجرون والصيانة" : "Tenants & Maintenance" },
            { to: `/app/properties/${propertyId}/reports`, label: t("التقارير") },
            { to: `/app/properties/${propertyId}/activity`, label: t("النشاط") },
          ]}
        />
      </div>

      <Outlet context={data} />
    </div>
  );
}
