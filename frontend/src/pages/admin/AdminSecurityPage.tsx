import { useEffect, useState } from "react";
import { LogOut, Wrench, UserPlus, Power } from "lucide-react";
import { adminApi, FeatureDef, PlatformSettings } from "../../api/admin";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";
import { Modal } from "../../components/ui/Modal";

export default function AdminSecurityPage() {
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [features, setFeatures] = useState<FeatureDef[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [disabling, setDisabling] = useState<FeatureDef | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    adminApi
      .platform()
      .then((p) => {
        setPlatform(p);
        setMessage(p.maintenanceMessage);
      })
      .catch((e) => setError((e as Error).message));
    adminApi.features().then(setFeatures).catch(() => {});
  }, []);

  async function save(patch: Partial<PlatformSettings>, success: string) {
    setError(null);
    setNotice(null);
    try {
      const next = await adminApi.updatePlatform(patch);
      setPlatform(next);
      setNotice(success);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!platform) return error ? <ErrorText message={error} /> : <PageSpinner />;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink-800">الأمان والتحكم بالمنصة</h1>
      <p className="mb-6 text-sm text-ink-400">مفاتيح طوارئ تؤثر على كل المستخدمين (عدا الأدمن).</p>

      <ErrorText message={error} />
      {notice && <p className="mb-4 rounded-md bg-sage-50 px-3 py-2 text-sm text-sage-600">{notice}</p>}

      <div className="space-y-6">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-800">
                <Wrench className="h-4 w-4" /> وضع الصيانة
              </h2>
              <p className="mt-1 text-sm text-ink-400">عند التفعيل لا يستطيع أي مستخدم استخدام المنصة أو تسجيل الدخول، ويرى الرسالة أدناه.</p>
            </div>
            <button
              className={platform.maintenanceMode ? "btn-danger" : "btn-outline"}
              onClick={() =>
                save(
                  { maintenanceMode: !platform.maintenanceMode, maintenanceMessage: message.trim() || platform.maintenanceMessage },
                  platform.maintenanceMode ? "تم إيقاف وضع الصيانة." : "تم تفعيل وضع الصيانة."
                )
              }
            >
              <Power className="h-4 w-4" />
              {platform.maintenanceMode ? "إيقاف الصيانة" : "تفعيل الصيانة"}
            </button>
          </div>
          <label className="label mt-4">رسالة الصيانة</label>
          <div className="flex gap-2">
            <input className="input" maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="btn-outline shrink-0" onClick={() => save({ maintenanceMessage: message.trim() }, "تم حفظ الرسالة.")} disabled={message.trim().length < 3}>
              حفظ
            </button>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-800">
                <UserPlus className="h-4 w-4" /> التسجيل الجديد
              </h2>
              <p className="mt-1 text-sm text-ink-400">
                الحالة الآن: <strong>{platform.registrationOpen ? "مفتوح" : "مغلق"}</strong>. أغلقه إذا لاحظت تسجيلات مشبوهة أو هجومًا.
              </p>
            </div>
            <button
              className="btn-outline"
              onClick={() =>
                save({ registrationOpen: !platform.registrationOpen }, platform.registrationOpen ? "تم إغلاق التسجيل." : "تم فتح التسجيل.")
              }
            >
              {platform.registrationOpen ? "إغلاق التسجيل" : "فتح التسجيل"}
            </button>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-base font-semibold text-ink-800">تعطيل ميزات على مستوى المنصة</h2>
          <p className="mb-4 mt-1 text-sm text-ink-400">مفيد عند اكتشاف خلل أو إساءة استخدام في ميزة معيّنة. يرى المستخدمون السبب.</p>
          <div className="divide-y divide-ink-100">
            {features.map((f) => {
              const r = platform.disabledFeatures[f.key];
              const off = r !== undefined;
              return (
                <div key={f.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800">{f.label}</p>
                    {off && <p className="mt-1 text-xs text-clay-600">معطّلة — السبب: {r || "—"}</p>}
                  </div>
                  {off ? (
                    <button
                      className="btn-outline text-sm"
                      onClick={() => {
                        const next = { ...platform.disabledFeatures };
                        delete next[f.key];
                        save({ disabledFeatures: next }, `تمت إعادة تفعيل «${f.label}».`);
                      }}
                    >
                      إعادة التفعيل
                    </button>
                  ) : (
                    <button className="btn-outline text-sm text-clay-600" onClick={() => { setDisabling(f); setReason(""); }}>
                      تعطيل
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-800">
            <LogOut className="h-4 w-4" /> تسجيل خروج جميع المستخدمين
          </h2>
          <p className="mb-4 mt-1 text-sm text-ink-400">استخدمه عند الشك باختراق. يبقى حسابك مسجّلًا، ويحتاج الجميع لتسجيل الدخول من جديد.</p>
          <button
            className="btn-danger"
            onClick={async () => {
              if (!window.confirm("تسجيل خروج كل المستخدمين الآن؟")) return;
              try {
                const r = await adminApi.forceLogoutAll();
                setNotice(`تم تسجيل خروج ${r.count} حساب.`);
                setError(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            تسجيل خروج الجميع
          </button>
        </section>
      </div>

      <Modal open={!!disabling} onClose={() => setDisabling(null)} title={disabling ? `تعطيل: ${disabling.label}` : ""}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!disabling) return;
            save({ disabledFeatures: { ...platform.disabledFeatures, [disabling.key]: reason.trim() } }, `تم تعطيل «${disabling.label}».`);
            setDisabling(null);
          }}
        >
          <div>
            <label className="label">السبب (يظهر للمستخدمين)</label>
            <textarea className="input" rows={3} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setDisabling(null)}>إلغاء</button>
            <button className="btn-danger">تعطيل الميزة</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
