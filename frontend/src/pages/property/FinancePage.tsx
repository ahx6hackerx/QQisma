import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Plus, Upload, ShieldCheck, Send, AlertTriangle, FileText } from "lucide-react";
import { financeApi, evidenceApi, disputesApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Stat } from "../../components/ui/Stat";
import { EmptyState } from "../../components/ui/EmptyState";
import { verificationStatus, confirmationStatus } from "../../lib/status";
import { formatDateShort, formatMoney, monthLabel } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { Transaction } from "../../types";

const CATEGORIES_INCOME = ["إيجار", "خدمات مشتركة", "أخرى"];
const CATEGORIES_EXPENSE = ["صيانة", "كهرباء", "مياه", "تنظيف", "إدارة", "إصلاحات", "أخرى"];

export default function FinancePage() {
  const { myRole, refresh } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t } = useLanguage();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<"" | "INCOME" | "EXPENSE">("");
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [summary, setSummary] = useState<{ income: { reported: number; verified: number }; expense: { reported: number; verified: number } } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const canRecord = ["OWNER", "MANAGER", "ACCOUNTANT"].includes(myRole);
  const canReview = ["OWNER", "MANAGER"].includes(myRole);

  function load() {
    if (!propertyId) return;
    financeApi
      .list(propertyId, { month, year, type: typeFilter || undefined })
      .then((data) => {
        setTransactions(data.transactions);
        setSummary(data.summary);
      });
  }

  useEffect(load, [propertyId, month, year, typeFilter]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
          <div className="flex gap-1 rounded-md bg-ink-100 p-1">
            {[
              { key: "", label: t("الكل") },
              { key: "INCOME", label: t("إيرادات") },
              { key: "EXPENSE", label: t("مصاريف") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key as typeof typeFilter)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === tab.key ? "bg-white text-ink-800 shadow-sm" : "text-ink-400 hover:text-ink-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {canRecord && (
          <button onClick={() => setAddOpen(true)} className="btn-brass text-sm">
            <Plus className="h-4 w-4" />
            {t("تسجيل عملية")}
          </button>
        )}
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label={t("إيرادات مُدخلة")} value={formatMoney(summary.income.reported)} />
          <Stat label={t("إيرادات موثقة")} value={formatMoney(summary.income.verified)} tone="sage" />
          <Stat label={t("مصاريف مُدخلة")} value={formatMoney(summary.expense.reported)} />
          <Stat label={t("مصاريف موثقة")} value={formatMoney(summary.expense.verified)} tone="sage" />
        </div>
      )}

      {transactions?.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title={t("لا توجد عمليات لهذا الشهر")} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("التاريخ")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("التصنيف")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("المبلغ")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("الحالة")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("الإثباتات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {transactions?.map((tx) => {
                const s = verificationStatus[tx.status];
                return (
                  <tr key={tx.id} onClick={() => setSelected(tx)} className="cursor-pointer hover:bg-parchment-50">
                    <td className="px-4 py-3 text-ink-500">{formatDateShort(tx.date)}</td>
                    <td className="px-4 py-3 text-ink-800">{t(tx.category)}</td>
                    <td className={`num px-4 py-3 font-semibold ${tx.type === "INCOME" ? "text-sage-600" : "text-clay-500"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatMoney(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={t(s.label)} tone={s.tone} />
                    </td>
                    <td className="px-4 py-3 text-ink-500">{tx.evidence.length || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {propertyId && (
        <AddTransactionModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          propertyId={propertyId}
          onDone={() => {
            setAddOpen(false);
            load();
            refresh();
          }}
        />
      )}

      {propertyId && selected && (
        <TransactionDetailModal
          transaction={selected}
          propertyId={propertyId}
          canReview={canReview}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AddTransactionModal({
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
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState(CATEGORIES_INCOME[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCategory(type === "INCOME" ? CATEGORIES_INCOME[0] : CATEGORIES_EXPENSE[0]);
  }, [type]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await financeApi.create(propertyId, { type, category, amount: Number(amount), date, description: description || undefined });
      setAmount("");
      setDescription("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("تسجيل عملية مالية")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`flex-1 rounded-md border py-2 text-sm font-medium ${type === "INCOME" ? "border-sage-400 bg-sage-50 text-sage-600" : "border-ink-200 text-ink-500"}`}
          >
            {t("إيراد")}
          </button>
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`flex-1 rounded-md border py-2 text-sm font-medium ${type === "EXPENSE" ? "border-clay-400 bg-clay-50 text-clay-500" : "border-ink-200 text-ink-500"}`}
          >
            {t("مصروف")}
          </button>
        </div>
        <div>
          <label className="label">{t("التصنيف")}</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {(type === "INCOME" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t("المبلغ (JD)")}</label>
            <input className="input" type="number" required min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("التاريخ")}</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{t("وصف (اختياري)")}</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          {t("حفظ")}
        </button>
      </form>
    </Modal>
  );
}

function TransactionDetailModal({
  transaction,
  propertyId,
  canReview,
  onClose,
  onChanged,
}: {
  transaction: Transaction;
  propertyId: string;
  canReview: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [confirmationLink, setConfirmationLink] = useState<string | null>(null);
  const s = verificationStatus[transaction.status];

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      await evidenceApi.upload(propertyId, transaction.id, file);
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleReview() {
    setError(null);
    try {
      await financeApi.review(propertyId, transaction.id);
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDispute(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await disputesApi.create(propertyId, { transactionId: transaction.id, reason: disputeReason });
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRequestConfirmation(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await evidenceApi.requestConfirmation(propertyId, transaction.id, { respondentName });
      setConfirmationLink(res.publicLink);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Modal open onClose={onClose} title={t(transaction.category)} wide>
      <div className="space-y-5">
        <ErrorText message={error} />

        <div className="flex items-center justify-between rounded-md bg-parchment-100 p-4">
          <div>
            <p className={`num text-2xl font-bold ${transaction.type === "INCOME" ? "text-sage-600" : "text-clay-500"}`}>
              {formatMoney(transaction.amount)}
            </p>
            <p className="text-xs text-ink-400">{formatDateShort(transaction.date)} — {transaction.createdBy.fullName}</p>
          </div>
          <StatusBadge label={t(s.label)} tone={s.tone} />
        </div>

        {transaction.description && <p className="text-sm text-ink-600">{transaction.description}</p>}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-ink-700">
            {t("الإثباتات")} ({transaction.evidence.length})
          </h4>
          {transaction.evidence.length === 0 && <p className="text-sm text-ink-400">{t("لا يوجد إثبات مرفق بعد.")}</p>}
          <ul className="space-y-2">
            {transaction.evidence.map((e) => (
              <li key={e.id}>
                <a
                  href={e.document.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-ink-100 px-3 py-2 text-sm text-ink-600 hover:bg-parchment-50"
                >
                  <FileText className="h-4 w-4 text-ink-300" />
                  {e.document.fileName}
                  <span className="ms-auto text-xs text-ink-400">{e.uploadedBy.fullName}</span>
                </a>
              </li>
            ))}
          </ul>
          <label className="btn-outline mt-3 inline-flex cursor-pointer text-sm">
            <Upload className="h-4 w-4" />
            {uploading ? t("جارٍ الرفع...") : t("رفع إثبات")}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>

        {transaction.confirmation ? (
          <div className="rounded-md border border-ink-100 p-3">
            <p className="mb-1 text-sm font-semibold text-ink-700">{t("تأكيد الطرف الآخر")}</p>
            <div className="flex items-center gap-2">
              <StatusBadge
                label={t(confirmationStatus[transaction.confirmation.status].label)}
                tone={confirmationStatus[transaction.confirmation.status].tone}
              />
              {transaction.confirmation.confirmedAmount != null && (
                <span className="num text-sm text-ink-500">{formatMoney(transaction.confirmation.confirmedAmount)}</span>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequestConfirmation} className="rounded-md border border-dashed border-ink-200 p-3">
            <p className="mb-2 text-sm font-semibold text-ink-700">{t("طلب تأكيد من طرف مستقل (مثل المستأجر)")}</p>
            {confirmationLink ? (
              <p className="text-sm text-sage-600">
                {t("تم إنشاء رابط التأكيد:")} <span className="num">{confirmationLink}</span>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={t("اسم الطرف الآخر")}
                  required
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                />
                <button className="btn-outline shrink-0 text-sm">
                  <Send className="h-4 w-4" />
                  {t("إرسال طلب")}
                </button>
              </div>
            )}
          </form>
        )}

        <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
          {canReview && transaction.status !== "VERIFIED" && transaction.evidence.length > 0 && (
            <button onClick={handleReview} className="btn-brass text-sm">
              <ShieldCheck className="h-4 w-4" />
              {t("توثيق العملية")}
            </button>
          )}
          {!showDisputeForm ? (
            <button onClick={() => setShowDisputeForm(true)} className="btn-outline text-sm">
              <AlertTriangle className="h-4 w-4" />
              {t("فتح اعتراض")}
            </button>
          ) : (
            <form onSubmit={handleDispute} className="flex w-full gap-2 pt-2">
              <input
                className="input"
                placeholder={t("سبب الاعتراض")}
                required
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
              <button className="btn-danger shrink-0 text-sm">{t("إرسال")}</button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
