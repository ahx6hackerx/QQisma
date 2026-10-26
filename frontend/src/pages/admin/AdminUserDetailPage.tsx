import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Ban, KeyRound, LogOut, Trash2, Unlock, ShieldCheck, Copy, Check } from "lucide-react";
import { adminApi, AdminUserDetail, FeatureDef } from "../../api/admin";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";
import { Modal } from "../../components/ui/Modal";
import { formatDateTime } from "../../lib/format";
import { StatusPill } from "./shared";

type Dialog =
  | { kind: "ban" }
  | { kind: "password" }
  | { kind: "remove" }
  | { kind: "feature"; feature: FeatureDef }
  | null;

export default function AdminUserDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [features, setFeatures] = useState<FeatureDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(() => {
    adminApi.user(id).then(setUser).catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(() => {
    load();
    adminApi.features().then(setFeatures).catch(() => {});
  }, [load]);

  async function run(fn: () => Promise<unknown>, success: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(success);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!user) return error ? <ErrorText message={error} /> : <PageSpinner />;

  const removed = user.status === "REMOVED";
  const protectedAccount = user.isAdmin;
  const restrictionOf = (key: string) => user.restrictions.find((r) => r.feature === key);

  return (
    <div>
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-700">
        <ArrowRight className="h-4 w-4" /> كل الحسابات
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-ink-800">{user.fullName}</h1>
        <StatusPill status={user.status} locked={user.locked} />
        {user.isAdmin && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-medium text-brass-700">
            <ShieldCheck className="h-3 w-3" /> أدمن
          </span>
        )}
      </div>

      <ErrorText message={error} />
      {notice && <p className="mb-4 rounded-md bg-sage-50 px-3 py-2 text-sm text-sage-600">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-ink-800">معلومات الحساب</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="البريد الإلكتروني" value={user.email} />
              <Info label="الهاتف" value={user.phone || "—"} />
              <Info label="نوع الحساب" value={user.accountType === "BROKER" ? "وسيط عقاري" : "مالك / شريك"} />
              <Info label="تاريخ التسجيل" value={formatDateTime(user.createdAt)} />
              <Info label="آخر دخول" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "لم يدخل بعد"} />
              <Info label="آخر IP" value={user.lastLoginIp || "—"} />
              <Info label="عدد العقارات" value={String(user.propertiesCount)} />
              <Info label="معاملات / مستندات" value={`${user.transactionsCount} / ${user.documentsCount}`} />
              {user.failedLogins > 0 && <Info label="محاولات دخول فاشلة" value={String(user.failedLogins)} />}
              {user.locked && user.lockedUntil && <Info label="مقفل حتى" value={formatDateTime(user.lockedUntil)} />}
            </dl>
            {user.status === "SUSPENDED" && (
              <p className="mt-4 rounded-md bg-clay-50 px-3 py-2 text-sm text-clay-600">
                سبب الحظر: {user.statusReason || "—"}
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-semibold text-ink-800">التحكم بالميزات</h2>
            <p className="mb-4 mt-1 text-sm text-ink-400">
              عند حجب ميزة يظهر للمستخدم السبب الذي تكتبه عند محاولته استخدامها.
            </p>
            <div className="divide-y divide-ink-100">
              {features.map((f) => {
                const r = restrictionOf(f.key);
                return (
                  <div key={f.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800">{f.label}</p>
                      <p className="text-xs text-ink-400">{f.description}</p>
                      {r && <p className="mt-1 text-xs text-clay-600">محجوبة — السبب: {r.reason}</p>}
                    </div>
                    {protectedAccount || removed ? null : r ? (
                      <button
                        className="btn-outline text-sm"
                        onClick={() => run(() => adminApi.enableFeature(user.id, f.key), `تمت إتاحة «${f.label}» للمستخدم.`)}
                      >
                        إتاحة
                      </button>
                    ) : (
                      <button className="btn-outline text-sm text-clay-600" onClick={() => setDialog({ kind: "feature", feature: f })}>
                        حجب
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-ink-800">العقارات المرتبطة</h2>
            {user.properties.length === 0 ? (
              <p className="text-sm text-ink-400">لا توجد عقارات.</p>
            ) : (
              <ul className="space-y-1 text-sm text-ink-600">
                {user.properties.map((p) => (
                  <li key={p.id}>• {p.name}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-ink-800">إجراءات الحساب</h2>
            {protectedAccount ? (
              <p className="text-sm text-ink-400">
                هذا حساب أدمن. لا يمكن إدارته من هنا، وتُدار صلاحيات الأدمن من متغير ADMIN_EMAILS في إعدادات الخادم.
              </p>
            ) : removed ? (
              <p className="text-sm text-ink-400">هذا الحساب محذوف ولا يمكن تنفيذ إجراءات عليه.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {user.status === "SUSPENDED" ? (
                  <button className="btn-outline" onClick={() => run(() => adminApi.unban(user.id), "تم رفع الحظر.")}>
                    <Check className="h-4 w-4" /> رفع الحظر
                  </button>
                ) : (
                  <button className="btn-outline text-clay-600" onClick={() => setDialog({ kind: "ban" })}>
                    <Ban className="h-4 w-4" /> حظر الحساب
                  </button>
                )}
                <button className="btn-outline" onClick={() => setDialog({ kind: "password" })}>
                  <KeyRound className="h-4 w-4" /> تغيير كلمة السر
                </button>
                <button
                  className="btn-outline"
                  onClick={() => {
                    if (window.confirm("تسجيل خروج هذا المستخدم من كل أجهزته؟")) {
                      run(() => adminApi.forceLogout(user.id), "تم تسجيل خروج المستخدم.");
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" /> تسجيل خروج إجباري
                </button>
                {user.locked && (
                  <button className="btn-outline" onClick={() => run(() => adminApi.unlock(user.id), "تم فك القفل.")}>
                    <Unlock className="h-4 w-4" /> فك القفل المؤقت
                  </button>
                )}
                <button className="btn-danger mt-2" onClick={() => setDialog({ kind: "remove" })}>
                  <Trash2 className="h-4 w-4" /> إزالة الحساب
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {dialog?.kind === "ban" && (
        <ReasonModal
          title="حظر الحساب"
          intro="سيُسجَّل خروج المستخدم فورًا ولن يستطيع الدخول. سيرى السبب عند محاولته تسجيل الدخول."
          submitLabel="حظر"
          danger
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            await adminApi.ban(user.id, reason);
            setNotice("تم حظر الحساب.");
            setDialog(null);
            load();
          }}
        />
      )}
      {dialog?.kind === "feature" && (
        <ReasonModal
          title={`حجب: ${dialog.feature.label}`}
          intro="اكتب السبب الذي سيظهر للمستخدم عند محاولته استخدام هذه الميزة."
          submitLabel="حجب الميزة"
          danger
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            await adminApi.disableFeature(user.id, dialog.feature.key, reason);
            setNotice(`تم حجب «${dialog.feature.label}».`);
            setDialog(null);
            load();
          }}
        />
      )}
      {dialog?.kind === "password" && <PasswordModal userId={user.id} onClose={() => { setDialog(null); load(); }} />}
      {dialog?.kind === "remove" && (
        <RemoveModal
          email={user.email}
          onClose={() => setDialog(null)}
          onSubmit={async (confirmEmail) => {
            await adminApi.remove(user.id, confirmEmail);
            navigate("/admin/users");
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="mt-0.5 break-all text-ink-800">{value}</dd>
    </div>
  );
}

function ReasonModal({
  title,
  intro,
  submitLabel,
  danger,
  onClose,
  onSubmit,
}: {
  title: string;
  intro: string;
  submitLabel: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-500">{intro}</p>
        <ErrorText message={error} />
        <div>
          <label className="label">السبب</label>
          <textarea className="input" rows={3} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className={danger ? "btn-danger" : "btn-brass"} disabled={busy}>
            {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [mode, setMode] = useState<"generate" | "custom">("generate");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await adminApi.resetPassword(userId, mode === "custom" ? password : undefined);
      if (r.temporaryPassword) setResult(r.temporaryPassword);
      else setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="تغيير كلمة السر">
      {result || done ? (
        <div className="space-y-4">
          <p className="text-sm text-sage-600">تم تغيير كلمة السر وتسجيل خروج المستخدم من كل أجهزته.</p>
          {result && (
            <div>
              <p className="mb-1 text-sm text-ink-500">كلمة السر المؤقتة (تظهر مرة واحدة فقط، سلّمها للمستخدم بطريقة آمنة):</p>
              <div className="flex items-center gap-2">
                <code className="num flex-1 select-all rounded-md bg-ink-100 px-3 py-2 text-sm text-ink-800" dir="ltr">{result}</code>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(result).then(() => setCopied(true)).catch(() => {});
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button className="btn-brass" onClick={onClose}>تم</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorText message={error} />
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input type="radio" checked={mode === "generate"} onChange={() => setMode("generate")} className="mt-1" />
            <span>توليد كلمة سر مؤقتة عشوائية وعرضها لي</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input type="radio" checked={mode === "custom"} onChange={() => setMode("custom")} className="mt-1" />
            <span>أكتب كلمة السر بنفسي</span>
          </label>
          {mode === "custom" && (
            <input className="input" type="text" dir="ltr" minLength={8} required placeholder="8 أحرف على الأقل" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn-brass" disabled={busy}>
              {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              تغيير
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RemoveModal({ email, onClose, onSubmit }: { email: string; onClose: () => void; onSubmit: (email: string) => Promise<void> }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(typed.trim());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="إزالة الحساب">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-500">
          سيتم تعطيل الحساب نهائيًا ومسح بياناته الشخصية (الاسم والبريد والهاتف والصورة وكلمة السر والإشعارات). السجلات المالية
          التي أنشأها تبقى بدون هوية حتى لا تتأثر دفاتر الشركاء الآخرين. لا يمكن التراجع.
        </p>
        <ErrorText message={error} />
        <div>
          <label className="label">للتأكيد اكتب بريد الحساب: <span dir="ltr" className="font-mono">{email}</span></label>
          <input className="input" dir="ltr" value={typed} onChange={(e) => setTyped(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-danger" disabled={busy || typed.trim().toLowerCase() !== email.toLowerCase()}>
            {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            إزالة نهائية
          </button>
        </div>
      </form>
    </Modal>
  );
}
