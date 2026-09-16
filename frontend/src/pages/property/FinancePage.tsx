import { FormEvent, useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Plus, Upload, ShieldCheck, Send, AlertTriangle, FileText, FileSpreadsheet, Camera, Mic, MicOff, Check } from "lucide-react";
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
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [prefill, setPrefill] = useState<{ amount?: number; date?: string; scannedFile?: File } | null>(null);

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
          <div className="flex gap-2">
            <button onClick={() => setImportOpen(true)} className="btn-outline text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              {t("استيراد كشف حساب")}
            </button>
            <button onClick={() => { setPrefill(null); setAddOpen(true); }} className="btn-brass text-sm">
              <Plus className="h-4 w-4" />
              {t("تسجيل عملية")}
            </button>
          </div>
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
                    <td className="px-4 py-3 text-ink-800">
                      {t(tx.category)}
                      {tx.tenant && <span className="ms-1 text-xs text-ink-400">— {tx.tenant.unitLabel}</span>}
                    </td>
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
          prefill={prefill}
          onDone={() => {
            setAddOpen(false);
            load();
            refresh();
          }}
        />
      )}

      {propertyId && (
        <BankImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          propertyId={propertyId}
          onDone={() => {
            setImportOpen(false);
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

// ---------------------------------------------------------------------------
// Add transaction — now with OCR receipt scan + voice entry as fast paths
// into the same form, which the person always reviews before saving.
// ---------------------------------------------------------------------------

function useVoiceInput(onResult: (transcript: string) => void) {
  const { language } = useLanguage();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [supported] = useState(() => typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

  function toggle() {
    if (!supported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "ar" ? "ar-JO" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return { toggle, listening, supported };
}

function parseVoiceTranscript(transcript: string): { amount?: number; category?: string; type?: "INCOME" | "EXPENSE" } {
  const amountMatch = transcript.match(/\d+(\.\d+)?/);
  const amount = amountMatch ? Number(amountMatch[0]) : undefined;
  const keywordMap: Record<string, string> = {
    كهرباء: "كهرباء", مياه: "مياه", صيانة: "صيانة", تنظيف: "تنظيف", إدارة: "إدارة", اصلاح: "إصلاحات", إصلاح: "إصلاحات", إيجار: "إيجار",
  };
  let category: string | undefined;
  for (const [kw, cat] of Object.entries(keywordMap)) {
    if (transcript.includes(kw)) {
      category = cat;
      break;
    }
  }
  const type: "INCOME" | "EXPENSE" = category === "إيجار" ? "INCOME" : "EXPENSE";
  return { amount, category, type };
}

function AddTransactionModal({
  open,
  onClose,
  propertyId,
  onDone,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  onDone: () => void;
  prefill?: { amount?: number; date?: string; scannedFile?: File } | null;
}) {
  const { t, language } = useLanguage();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState(CATEGORIES_INCOME[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const voice = useVoiceInput((transcript) => {
    const parsed = parseVoiceTranscript(transcript);
    if (parsed.amount) setAmount(String(parsed.amount));
    if (parsed.type) setType(parsed.type);
    if (parsed.category) setCategory(parsed.category);
    setDescription((prev) => prev || transcript);
  });

  useEffect(() => {
    setCategory(type === "INCOME" ? CATEGORIES_INCOME[0] : CATEGORIES_EXPENSE[0]);
  }, [type]);

  useEffect(() => {
    if (open && prefill) {
      if (prefill.amount) setAmount(String(prefill.amount));
      if (prefill.date) setDate(prefill.date.slice(0, 10));
      if (prefill.scannedFile) setScannedFile(prefill.scannedFile);
      setType("EXPENSE");
    }
    if (!open) {
      setAmount(""); setDescription(""); setScannedFile(null);
    }
  }, [open, prefill]);

  async function handleScanFile(file: File) {
    setScannedFile(file);
    setScanning(true);
    setError(null);
    try {
      const result = await financeApi.ocrReceipt(propertyId, file);
      if (result.suggestedAmount) setAmount(String(result.suggestedAmount));
      if (result.suggestedDate) setDate(result.suggestedDate.slice(0, 10));
      setType("EXPENSE");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const transaction = await financeApi.create(propertyId, {
        type,
        category,
        amount: Number(amount),
        date,
        description: description || undefined,
      });
      if (scannedFile) {
        await evidenceApi.upload(propertyId, transaction.id, scannedFile, language === "ar" ? "مرفق من مسح فاتورة" : "Attached from receipt scan");
      }
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

        <div className="flex gap-2 rounded-md bg-parchment-100 p-2">
          <label className="btn-outline flex-1 cursor-pointer justify-center text-xs">
            <Camera className="h-3.5 w-3.5" />
            {scanning ? (language === "ar" ? "جارٍ القراءة..." : "Reading...") : language === "ar" ? "امسح فاتورة" : "Scan receipt"}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleScanFile(e.target.files[0])} />
          </label>
          {voice.supported && (
            <button
              type="button"
              onClick={voice.toggle}
              className={`btn-outline flex-1 justify-center text-xs ${voice.listening ? "border-clay-400 bg-clay-50 text-clay-500" : ""}`}
            >
              {voice.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {voice.listening ? (language === "ar" ? "جارٍ الاستماع..." : "Listening...") : language === "ar" ? "إدخال صوتي" : "Voice entry"}
            </button>
          )}
        </div>
        {scannedFile && (
          <p className="flex items-center gap-1.5 text-xs text-sage-600">
            <Check className="h-3.5 w-3.5" /> {scannedFile.name} {language === "ar" ? "سيُرفق كإثبات تلقائيًا" : "will be attached as evidence"}
          </p>
        )}

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

// ---------------------------------------------------------------------------
// Bank statement import
// ---------------------------------------------------------------------------

function BankImportModal({ open, onClose, propertyId, onDone }: { open: boolean; onClose: () => void; propertyId: string; onDone: () => void }) {
  const { language } = useLanguage();
  const [rows, setRows] = useState<any[] | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const data = await financeApi.bankImportPreview(propertyId, file);
      setRows(data.rows);
      setSelectedRows(new Set(data.rows.map((r: any, i: number) => (!r.matched ? i : -1)).filter((i: number) => i >= 0)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!rows) return;
    setConfirming(true);
    try {
      const chosen = rows.filter((_, i) => selectedRows.has(i));
      await financeApi.bankImportConfirm(propertyId, chosen);
      onDone();
      setRows(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={language === "ar" ? "استيراد كشف حساب بنكي" : "Import bank statement"} wide>
      <div className="space-y-4">
        <ErrorText message={error} />
        {!rows ? (
          <>
            <p className="text-sm text-ink-500">
              {language === "ar"
                ? "ارفع ملف CSV مُصدَّر من تطبيق البنك (أعمدة Date/Amount) أو كشف حساب PDF نصي. سيقارن النظام الحركات مع السجل الحالي تلقائيًا."
                : "Upload a CSV export from your bank app (Date/Amount columns) or a text-based PDF statement. Transactions are automatically matched against your existing ledger."}
            </p>
            <label className="btn-brass inline-flex cursor-pointer">
              <Upload className="h-4 w-4" />
              {loading ? (language === "ar" ? "جارٍ التحليل..." : "Analyzing...") : language === "ar" ? "اختر الملف" : "Choose file"}
              <input type="file" accept=".csv,.pdf" className="hidden" disabled={loading} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-500">
              {language === "ar"
                ? `تم العثور على ${rows.length} حركة — ${rows.filter((r) => r.matched).length} متطابقة مع السجل الحالي، والباقي جديد. حدد ما تريد استيراده.`
                : `Found ${rows.length} transactions — ${rows.filter((r) => r.matched).length} already match your ledger, the rest are new. Select what to import.`}
            </p>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-ink-100">
              <table className="w-full text-sm">
                <thead className="bg-parchment-200 text-xs text-ink-500">
                  <tr>
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-3 py-2 text-start">{language === "ar" ? "التاريخ" : "Date"}</th>
                    <th className="px-3 py-2 text-start">{language === "ar" ? "الوصف" : "Description"}</th>
                    <th className="px-3 py-2 text-start">{language === "ar" ? "المبلغ" : "Amount"}</th>
                    <th className="px-3 py-2 text-start">{language === "ar" ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.matched ? "opacity-50" : ""}>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={r.matched}
                          checked={selectedRows.has(i)}
                          onChange={(e) =>
                            setSelectedRows((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(i);
                              else next.delete(i);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-ink-600">{formatDateShort(r.date)}</td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-ink-600">{r.description || "—"}</td>
                      <td className="num px-3 py-2 text-ink-700">{formatMoney(r.amount)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={r.matched ? (language === "ar" ? "متطابق" : "Matched") : language === "ar" ? "جديد" : "New"}
                          tone={r.matched ? "sage" : "brass"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={confirming || selectedRows.size === 0} className="btn-brass flex-1">
                {language === "ar" ? `استيراد ${selectedRows.size} حركة` : `Import ${selectedRows.size} transactions`}
              </button>
              <button onClick={() => setRows(null)} className="btn-ghost">
                {language === "ar" ? "رجوع" : "Back"}
              </button>
            </div>
          </>
        )}
      </div>
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
