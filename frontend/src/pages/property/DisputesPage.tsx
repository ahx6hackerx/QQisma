import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { AlertTriangle, MessageSquare, CheckCircle2 } from "lucide-react";
import { disputesApi } from "../../api/client";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { disputeStatus, verificationStatus } from "../../lib/status";
import { formatDateShort, formatDateTime, formatMoney } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { Dispute } from "../../types";

export default function DisputesPage() {
  const { myRole, refresh } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t, language } = useLanguage();
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [filter, setFilter] = useState<"" | "OPEN" | "UNDER_REVIEW" | "RESOLVED">("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const canResolve = ["OWNER", "MANAGER"].includes(myRole);

  function load() {
    if (!propertyId) return;
    disputesApi.list(propertyId, filter || undefined).then(setDisputes);
  }

  useEffect(load, [propertyId, filter]);

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-md bg-ink-100 p-1 w-fit">
        {[
          { key: "", label: t("الكل") },
          { key: "OPEN", label: t("مفتوح") },
          { key: "UNDER_REVIEW", label: t("قيد المراجعة") },
          { key: "RESOLVED", label: t("تم الحل") },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${filter === tab.key ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {disputes?.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title={t("لا توجد اعتراضات")} />
      ) : (
        <div className="space-y-4">
          {disputes?.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge label={t(disputeStatus[d.status].label)} tone={disputeStatus[d.status].tone} />
                    <span className="text-xs text-ink-400">{formatDateShort(d.createdAt)}</span>
                  </div>
                  <p className="text-sm text-ink-800">{d.reason}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {language === "ar"
                      ? `فتحه ${d.raisedBy.fullName} — على عملية ${t(d.transaction.category)} بقيمة ${formatMoney(d.transaction.amount)}`
                      : `Opened by ${d.raisedBy.fullName} — on ${t(d.transaction.category)} worth ${formatMoney(d.transaction.amount)}`}{" "}
                    <StatusBadge label={t(verificationStatus[d.transaction.status].label)} tone={verificationStatus[d.transaction.status].tone} />
                  </p>
                </div>
                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="btn-ghost text-xs">
                  <MessageSquare className="h-4 w-4" />
                  {d.comments.length}
                </button>
              </div>

              {expanded === d.id && (
                <DisputeThread
                  dispute={d}
                  propertyId={propertyId!}
                  canResolve={canResolve}
                  onChanged={() => {
                    load();
                    refresh();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DisputeThread({
  dispute,
  propertyId,
  canResolve,
  onChanged,
}: {
  dispute: Dispute;
  propertyId: string;
  canResolve: boolean;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [correctedAmount, setCorrectedAmount] = useState("");
  const [showResolve, setShowResolve] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await disputesApi.comment(propertyId, dispute.id, message);
      setMessage("");
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await disputesApi.resolve(propertyId, dispute.id, {
        resolutionNote,
        correctedAmount: correctedAmount ? Number(correctedAmount) : undefined,
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mt-4 border-t border-ink-100 pt-4">
      <ErrorText message={error} />
      <div className="mb-3 space-y-3">
        {dispute.comments.map((c) => (
          <div key={c.id} className="flex gap-2 text-sm">
            <span className="font-medium text-ink-700">{c.author.fullName}:</span>
            <span className="text-ink-600">{c.message}</span>
            <span className="ms-auto shrink-0 text-xs text-ink-300">{formatDateTime(c.createdAt)}</span>
          </div>
        ))}
        {dispute.resolutionNote && (
          <p className="rounded-md bg-sage-50 px-3 py-2 text-sm text-sage-600">{t("تم الحل:")} {dispute.resolutionNote}</p>
        )}
      </div>

      {dispute.status !== "RESOLVED" && (
        <>
          <form onSubmit={handleComment} className="flex gap-2">
            <input className="input" placeholder={t("أضف تعليقًا...")} value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="btn-outline shrink-0 text-sm">{t("إرسال")}</button>
          </form>

          {canResolve && (
            <div className="mt-3">
              {!showResolve ? (
                <button onClick={() => setShowResolve(true)} className="btn-brass text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("حل الاعتراض")}
                </button>
              ) : (
                <form onSubmit={handleResolve} className="space-y-2 rounded-md bg-parchment-100 p-3">
                  <input
                    className="input"
                    placeholder={t("كيف تم حل الاعتراض؟")}
                    required
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder={t("تصحيح المبلغ (اختياري)")}
                    value={correctedAmount}
                    onChange={(e) => setCorrectedAmount(e.target.value)}
                  />
                  <button className="btn-brass text-sm">{t("تأكيد الحل")}</button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
