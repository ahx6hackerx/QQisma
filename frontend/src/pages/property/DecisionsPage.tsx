import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Plus, ThumbsUp, ThumbsDown, PlayCircle, Vote as VoteIcon } from "lucide-react";
import { decisionsApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { approvalRuleLabel, decisionStatus } from "../../lib/status";
import { formatDateShort, formatMoney } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { Decision } from "../../types";
import { useAuth } from "../../context/AuthContext";

export default function DecisionsPage() {
  const { myRole } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = ["OWNER", "MANAGER"].includes(myRole);

  function load() {
    if (!propertyId) return;
    decisionsApi.list(propertyId).then(setDecisions);
  }
  useEffect(load, [propertyId]);

  async function handleVote(id: string, choice: "APPROVE" | "REJECT") {
    if (!propertyId) return;
    setError(null);
    try {
      await decisionsApi.vote(propertyId, id, choice);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAction(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button onClick={() => setCreateOpen(true)} className="btn-brass text-sm">
          <Plus className="h-4 w-4" />
          {t("قرار جديد")}
        </button>
      </div>

      <ErrorText message={error} />

      {decisions?.length === 0 ? (
        <EmptyState icon={<VoteIcon className="h-8 w-8" />} title={t("لا توجد قرارات بعد")} />
      ) : (
        <div className="space-y-4">
          {decisions?.map((d) => {
            const myVote = d.votes.find((v) => v.user.id === user?.id);
            const isVotingRule = ["MAJORITY_VOTE", "TWO_THIRDS_VOTE", "UNANIMOUS_VOTE"].includes(d.ruleType);
            return (
              <div key={d.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <StatusBadge label={t(decisionStatus[d.status].label)} tone={decisionStatus[d.status].tone} />
                      <span className="text-xs text-ink-400">{t(approvalRuleLabel[d.ruleType])}</span>
                    </div>
                    <p className="font-display text-base font-semibold text-ink-800">{d.title}</p>
                    {d.description && <p className="mt-1 text-sm text-ink-500">{d.description}</p>}
                    <p className="mt-1 text-xs text-ink-400">
                      {d.amount && `${formatMoney(d.amount)} — `}
                      {language === "ar" ? `بواسطة ${d.createdBy.fullName}` : `by ${d.createdBy.fullName}`} — {formatDateShort(d.createdAt)}
                    </p>
                  </div>
                  {d.resultPercent != null && (
                    <div className="shrink-0 text-left">
                      <p className="text-xs text-ink-400">{t("نسبة الموافقة")}</p>
                      <p className="num text-lg font-bold text-ink-800">{d.resultPercent}%</p>
                    </div>
                  )}
                </div>

                {isVotingRule && d.status === "VOTING" && (
                  <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
                    <button
                      onClick={() => handleVote(d.id, "APPROVE")}
                      className={`btn-outline text-sm ${myVote?.choice === "APPROVE" ? "border-sage-400 bg-sage-50 text-sage-600" : ""}`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {t("موافق")}
                    </button>
                    <button
                      onClick={() => handleVote(d.id, "REJECT")}
                      className={`btn-outline text-sm ${myVote?.choice === "REJECT" ? "border-clay-400 bg-clay-50 text-clay-500" : ""}`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      {t("رفض")}
                    </button>
                    <div className="ms-auto flex -space-x-2 space-x-reverse">
                      {d.votes.map((v) => (
                        <span
                          key={v.id}
                          title={`${v.user.fullName}: ${v.choice === "APPROVE" ? t("موافق") : t("رفض")}`}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${
                            v.choice === "APPROVE" ? "bg-sage-500" : "bg-clay-500"
                          }`}
                        >
                          {v.user.fullName.charAt(0)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {d.ruleType === "MANAGER_APPROVAL" && d.status === "VOTING" && canManage && (
                  <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                    <button onClick={() => handleAction(() => decisionsApi.approve(propertyId!, d.id))} className="btn-brass text-sm">
                      {t("موافقة")}
                    </button>
                    <button onClick={() => handleAction(() => decisionsApi.reject(propertyId!, d.id))} className="btn-outline text-sm">
                      {t("رفض")}
                    </button>
                  </div>
                )}

                {d.status === "APPROVED" && canManage && (
                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <button onClick={() => handleAction(() => decisionsApi.execute(propertyId!, d.id))} className="btn-brass text-sm">
                      <PlayCircle className="h-4 w-4" />
                      {t("تسجيل التنفيذ")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {propertyId && (
        <CreateDecisionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          propertyId={propertyId}
          onDone={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateDecisionModal({
  open,
  onClose,
  propertyId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await decisionsApi.create(propertyId, { title, description: description || undefined, amount: amount ? Number(amount) : undefined });
      setTitle("");
      setDescription("");
      setAmount("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("قرار جديد")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{t("عنوان القرار")}</label>
          <input className="input" required placeholder={t("مثال: استبدال المصعد")} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("التفاصيل (اختياري)")}</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("المبلغ المرتبط JD (اختياري — يحدد قاعدة الموافقة المطلوبة)")}</label>
          <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          {t("إنشاء القرار")}
        </button>
      </form>
    </Modal>
  );
}
