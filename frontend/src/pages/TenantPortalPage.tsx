import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Wrench, Send } from "lucide-react";
import { tenantPortalApi } from "../api/client";
import { PageSpinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateShort, formatMoney } from "../lib/format";
import { verificationStatus } from "../lib/status";
import { useLanguage } from "../context/LanguageContext";

export default function TenantPortalPage() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"payments" | "maintenance">("payments");

  function load() {
    if (!token) return;
    tenantPortalApi
      .get(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [token]);

  if (loading) return <PageSpinner />;
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4">
        <p className="text-sm text-clay-500">{error ?? (language === "ar" ? "رابط غير صالح." : "Invalid link.")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-bold text-ink-800">قِسمة</p>
          <p className="mt-1 text-sm text-ink-400">
            {language === "ar" ? "بوابة المستأجر" : "Tenant Portal"} — {data.tenant.property.name}
          </p>
          <p className="text-xs text-ink-400">
            {data.tenant.fullName} — {data.tenant.unitLabel}
          </p>
        </div>

        <div className="mb-4 flex justify-center gap-1 rounded-md bg-ink-100 p-1">
          <button onClick={() => setTab("payments")} className={`rounded px-4 py-1.5 text-sm font-medium ${tab === "payments" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}>
            {language === "ar" ? "سجل الدفعات" : "Payment history"}
          </button>
          <button onClick={() => setTab("maintenance")} className={`rounded px-4 py-1.5 text-sm font-medium ${tab === "maintenance" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}>
            {language === "ar" ? "بلاغ صيانة" : "Report maintenance"}
          </button>
        </div>

        {tab === "payments" ? (
          <div className="space-y-3">
            {data.transactions.length === 0 && (
              <p className="card p-6 text-center text-sm text-ink-400">{language === "ar" ? "لا توجد عمليات مسجّلة بعد." : "No transactions recorded yet."}</p>
            )}
            {data.transactions.map((t: any, idx: number) => (
              <PaymentCard key={idx} transaction={t} token={String(token)} onResponded={load} language={language as "ar" | "en"} />
            ))}
          </div>
        ) : (
          <MaintenanceForm token={token!} language={language} />
        )}
      </div>
    </div>
  );
}

function PaymentCard({ transaction, token, onResponded, language }: { transaction: any; token: string; onResponded: () => void; language: "ar" | "en" }) {
  const [showDifferentForm, setShowDifferentForm] = useState(false);
  const [actualAmount, setActualAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const s = verificationStatus[transaction.status as keyof typeof verificationStatus];

  async function respond(confirmed: boolean) {
    setSubmitting(true);
    try {
      await tenantPortalApi.respond(token, transaction.id, { confirmed, actualAmount: confirmed ? undefined : Number(actualAmount) });
      onResponded();
    } finally {
      setSubmitting(false);
    }
  }

  const needsResponse = transaction.confirmation && transaction.confirmation.status === "PENDING";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink-800">{transaction.category}</p>
          <p className="text-xs text-ink-400">{formatDateShort(transaction.date)}</p>
        </div>
        <div className="text-left">
          <p className="num font-semibold text-ink-800">{formatMoney(transaction.amount)}</p>
          <StatusBadge label={s.label} tone={s.tone} />
        </div>
      </div>
      {needsResponse && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          {!showDifferentForm ? (
            <div className="flex gap-2">
              <button onClick={() => respond(true)} disabled={submitting} className="btn-brass flex-1 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {language === "ar" ? "المبلغ صحيح" : "Amount is correct"}
              </button>
              <button onClick={() => setShowDifferentForm(true)} className="btn-outline flex-1 text-sm">
                <XCircle className="h-4 w-4" />
                {language === "ar" ? "المبلغ مختلف" : "Amount is different"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className="input" type="number" placeholder={language === "ar" ? "المبلغ الصحيح" : "Correct amount"} value={actualAmount} onChange={(e) => setActualAmount(e.target.value)} />
              <button onClick={() => respond(false)} disabled={submitting || !actualAmount} className="btn-primary shrink-0 text-sm">
                {language === "ar" ? "إرسال" : "Send"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MaintenanceForm({ token, language }: { token: string; language: "ar" | "en" }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("NORMAL");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await tenantPortalApi.reportMaintenance(token, { title, description: description || undefined, urgency });
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card p-6 text-center">
        <Wrench className="mx-auto mb-3 h-8 w-8 text-sage-500" />
        <p className="font-medium text-ink-700">{language === "ar" ? "تم إرسال البلاغ بنجاح." : "Your report has been sent."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5">
      {error && <p className="rounded-md bg-clay-50 px-3 py-2 text-sm text-clay-600">{error}</p>}
      <div>
        <label className="label">{language === "ar" ? "عنوان المشكلة" : "Issue title"}</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">{language === "ar" ? "التفاصيل (اختياري)" : "Details (optional)"}</label>
        <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">{language === "ar" ? "الأولوية" : "Urgency"}</label>
        <select className="input" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option value="LOW">{language === "ar" ? "منخفضة" : "Low"}</option>
          <option value="NORMAL">{language === "ar" ? "عادية" : "Normal"}</option>
          <option value="URGENT">{language === "ar" ? "عاجلة" : "Urgent"}</option>
        </select>
      </div>
      <button className="btn-brass w-full" disabled={loading}>
        <Send className="h-4 w-4" />
        {language === "ar" ? "إرسال البلاغ" : "Send report"}
      </button>
    </form>
  );
}
