import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Plus, Upload, CheckCircle2, FileSearch } from "lucide-react";
import { evidenceApi, propertiesApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { evidenceRequestStatus } from "../../lib/status";
import { formatDateShort, formatMoney } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { EvidenceRequest, PropertyMember } from "../../types";

interface Discrepancy {
  transactionId: string;
  category: string;
  date: string;
  reportedAmount: number;
  confirmedAmount: number | null;
  result: "MATCHED" | "DISCREPANCY" | "PENDING";
  difference: number | null;
}

export default function EvidencePage() {
  const { myRole } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t } = useLanguage();

  const [requests, setRequests] = useState<EvidenceRequest[] | null>(null);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[] | null>(null);
  const [partners, setPartners] = useState<PropertyMember[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"requests" | "discrepancies">("requests");

  const canComplete = ["OWNER", "MANAGER"].includes(myRole);

  function load() {
    if (!propertyId) return;
    evidenceApi.requests(propertyId).then(setRequests);
    evidenceApi.discrepancies(propertyId).then(setDiscrepancies);
    propertiesApi.partners(propertyId).then(setPartners);
  }

  useEffect(load, [propertyId]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-md bg-ink-100 p-1">
          <button
            onClick={() => setTab("requests")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === "requests" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
          >
            {t("طلبات الإثبات")}
          </button>
          <button
            onClick={() => setTab("discrepancies")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === "discrepancies" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
          >
            {t("الفروقات")}
          </button>
        </div>
        {tab === "requests" && (
          <button onClick={() => setCreateOpen(true)} className="btn-brass text-sm">
            <Plus className="h-4 w-4" />
            {t("طلب إثبات")}
          </button>
        )}
      </div>

      {tab === "requests" &&
        (requests?.length === 0 ? (
          <EmptyState icon={<FileSearch className="h-8 w-8" />} title={t("لا توجد طلبات إثبات")} />
        ) : (
          <div className="space-y-3">
            {requests?.map((r) => {
              const s = evidenceRequestStatus[r.status];
              return (
                <div key={r.id} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-ink-800">{r.message}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {r.requestedBy.fullName} {r.assignedTo && `→ ${r.assignedTo.fullName}`} — {formatDateShort(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={t(s.label)} tone={s.tone} />
                    {r.status === "PENDING" && (
                      <label className="btn-outline cursor-pointer text-xs">
                        <Upload className="h-3.5 w-3.5" />
                        {t("رفع")}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0] && propertyId) {
                              evidenceApi
                                .upload(propertyId, r.id, e.target.files[0])
                                .catch(() => {})
                                .finally(load);
                            }
                          }}
                        />
                      </label>
                    )}
                    {r.status === "UPLOADED" && canComplete && (
                      <button
                        onClick={() => propertyId && evidenceApi.completeRequest(propertyId, r.id).then(load)}
                        className="btn-outline text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("إغلاق الطلب")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "discrepancies" &&
        (discrepancies?.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-8 w-8" />}
            title={t("لا توجد فروقات مسجّلة")}
            description={t("ستظهر هنا العمليات التي طلبت تأكيدًا من طرف مستقل.")}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-parchment-200 text-xs text-ink-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t("العملية")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("المبلغ المسجل")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("التأكيد")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("الفرق")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("النتيجة")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {discrepancies?.map((d) => (
                  <tr key={d.transactionId}>
                    <td className="px-4 py-3 text-ink-800">
                      {t(d.category)}
                      <p className="text-xs text-ink-400">{formatDateShort(d.date)}</p>
                    </td>
                    <td className="num px-4 py-3 text-ink-700">{formatMoney(d.reportedAmount)}</td>
                    <td className="num px-4 py-3 text-ink-700">{d.confirmedAmount != null ? formatMoney(d.confirmedAmount) : t("بانتظار الرد")}</td>
                    <td className="num px-4 py-3 text-ink-700">{d.difference ? formatMoney(d.difference) : "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={d.result === "MATCHED" ? t("متطابق") : d.result === "DISCREPANCY" ? t("فرق") : t("بانتظار")}
                        tone={d.result === "MATCHED" ? "sage" : d.result === "DISCREPANCY" ? "clay" : "neutral"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {propertyId && (
        <CreateRequestModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          propertyId={propertyId}
          partners={partners}
          onDone={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateRequestModal({
  open,
  onClose,
  propertyId,
  partners,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  partners: PropertyMember[];
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await evidenceApi.createRequest(propertyId, { message, assignedToId: assignedToId || undefined });
      setMessage("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("طلب إثبات")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{t("وصف الطلب")}</label>
          <input className="input" required placeholder={t("مثال: أرفق كشف حساب شهر سبتمبر")} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("توجيه الطلب إلى (اختياري)")}</label>
          <select className="input" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
            <option value="">{t("كل الشركاء")}</option>
            {partners.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.user.fullName}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          {t("إرسال الطلب")}
        </button>
      </form>
    </Modal>
  );
}
