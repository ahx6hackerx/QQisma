import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Clock, ShieldAlert } from "lucide-react";
import { reportsApi } from "../../api/client";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { ActivityItem, AuditLogItem } from "../../types";

export default function ActivityPage() {
  const { myRole } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t } = useLanguage();
  const [tab, setTab] = useState<"activity" | "audit">("activity");
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogItem[] | null>(null);

  const canSeeAudit = ["OWNER", "MANAGER"].includes(myRole);

  useEffect(() => {
    if (propertyId) reportsApi.activity(propertyId).then(setActivity);
  }, [propertyId]);

  useEffect(() => {
    if (propertyId && tab === "audit" && canSeeAudit) reportsApi.auditLog(propertyId).then(setAuditLog);
  }, [propertyId, tab, canSeeAudit]);

  return (
    <div>
      {canSeeAudit && (
        <div className="mb-4 flex gap-1 rounded-md bg-ink-100 p-1 w-fit">
          <button
            onClick={() => setTab("activity")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === "activity" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
          >
            {t("سجل النشاط")}
          </button>
          <button
            onClick={() => setTab("audit")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === "audit" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
          >
            {t("سجل التدقيق (Audit Log)")}
          </button>
        </div>
      )}

      {tab === "activity" &&
        (activity?.length === 0 ? (
          <EmptyState icon={<Clock className="h-8 w-8" />} title={t("لا يوجد نشاط بعد")} />
        ) : (
          <div className="space-y-1">
            {activity?.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-ink-100 py-3 last:border-0">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass-400" />
                <div>
                  <p className="text-sm text-ink-700">
                    <span className="font-medium">{a.actorName}</span> — {a.details}
                  </p>
                  <p className="text-xs text-ink-400">{formatDateTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "audit" &&
        canSeeAudit &&
        (auditLog?.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="h-8 w-8" />}
            title={t("لا توجد سجلات تدقيق بعد")}
            description={t("هذا السجل يوثّق كل تعديل حساس (مبالغ، ملكية، إغلاق) بشكل ثابت لا يمكن تعديله.")}
          />
        ) : (
          <div className="space-y-3">
            {auditLog?.map((log) => (
              <div key={log.id} className="card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-800">{log.action}</p>
                  <span className="text-xs text-ink-400">{formatDateTime(log.createdAt)}</span>
                </div>
                <p className="text-xs text-ink-500">{log.actor.fullName} — {log.entityType}</p>
                {(log.beforeValue || log.afterValue) && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    {log.beforeValue && (
                      <div className="rounded bg-clay-50 p-2 text-clay-600">
                        <p className="mb-1 font-medium">{t("قبل")}</p>
                        <pre className="whitespace-pre-wrap break-words">{log.beforeValue}</pre>
                      </div>
                    )}
                    {log.afterValue && (
                      <div className="rounded bg-sage-50 p-2 text-sage-600">
                        <p className="mb-1 font-medium">{t("بعد")}</p>
                        <pre className="whitespace-pre-wrap break-words">{log.afterValue}</pre>
                      </div>
                    )}
                  </div>
                )}
                {log.reason && (
                  <p className="mt-2 text-xs italic text-ink-500">
                    {t("السبب:")} {log.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
