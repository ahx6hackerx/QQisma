import { FormEvent, useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { adminApi, AnnouncementRow } from "../../api/admin";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../lib/format";

const AUDIENCE_LABEL: Record<string, string> = { ALL: "جميع المستخدمين", OWNER: "المالكون فقط", BROKER: "الوسطاء فقط" };

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"ALL" | "OWNER" | "BROKER">("ALL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    adminApi.announcements().then(setItems).catch((e) => setError((e as Error).message));
  }
  useEffect(load, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm(`سيصل هذا التعميم إلى ${AUDIENCE_LABEL[audience]}. متابعة؟`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const a = await adminApi.sendAnnouncement({ title: title.trim(), message: message.trim(), audience });
      setNotice(`تم إرسال التعميم إلى ${a.recipientCount} مستخدم.`);
      setTitle("");
      setMessage("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink-800">التعاميم</h1>
      <p className="mb-6 text-sm text-ink-400">أرسل رسالة تصل إلى صندوق الإشعارات لدى المستخدمين.</p>

      <form onSubmit={submit} className="card mb-8 space-y-4 p-5">
        <ErrorText message={error} />
        {notice && <p className="rounded-md bg-sage-50 px-3 py-2 text-sm text-sage-600">{notice}</p>}
        <div>
          <label className="label">العنوان</label>
          <input className="input" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">نص التعميم</label>
          <textarea className="input" rows={4} required maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="mt-1 text-xs text-ink-400">{message.length} / 1000</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="label">المستلمون</label>
            <select className="input" value={audience} onChange={(e) => setAudience(e.target.value as "ALL" | "OWNER" | "BROKER")}>
              <option value="ALL">جميع المستخدمين</option>
              <option value="OWNER">المالكون فقط</option>
              <option value="BROKER">الوسطاء فقط</option>
            </select>
          </div>
          <button className="btn-brass" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Send className="h-4 w-4" />}
            إرسال التعميم
          </button>
        </div>
      </form>

      <h2 className="mb-3 font-display text-base font-semibold text-ink-800">التعاميم السابقة</h2>
      {!items ? (
        <PageSpinner />
      ) : items.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-8 w-8" />} title="لم يتم إرسال أي تعميم بعد" />
      ) : (
        <div className="card divide-y divide-ink-100">
          {items.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink-800">{a.title}</p>
                <p className="text-xs text-ink-400">
                  {formatDateTime(a.createdAt)} — {AUDIENCE_LABEL[a.audience]} — {a.recipientCount} مستلم
                </p>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-500">{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
