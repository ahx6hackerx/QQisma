import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { History, Plus, UserPlus, ArrowRightLeft, MessageCircle, Scale } from "lucide-react";
import { ownershipApi, propertiesApi, whatsappApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { roleLabel } from "../../lib/status";
import { formatDate } from "../../lib/format";
import { calculateInheritance, InheritanceInput } from "../../lib/inheritance";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { OwnershipRecord, PropertyMember, Role } from "../../types";

const ROLES: Role[] = ["OWNER", "MANAGER", "ACCOUNTANT", "VIEWER"];

export default function OwnershipPage() {
  const { ownership, myRole, refresh } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t, language } = useLanguage();

  const [history, setHistory] = useState<OwnershipRecord[] | null>(null);
  const [partners, setPartners] = useState<PropertyMember[] | null>(null);
  const [tab, setTab] = useState<"current" | "history" | "partners" | "inheritance">("current");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const canManage = myRole === "OWNER";

  function loadHistory() {
    if (propertyId) ownershipApi.history(propertyId).then(setHistory);
  }
  function loadPartners() {
    if (propertyId) propertiesApi.partners(propertyId).then(setPartners);
  }

  useEffect(() => {
    loadHistory();
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function handleRoleChange(userId: string, role: Role) {
    if (!propertyId) return;
    await propertiesApi.updatePartnerRole(propertyId, userId, role);
    loadPartners();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-ink-100 p-1">
          {[
            { key: "current", label: t("الملكية الحالية") },
            { key: "history", label: t("السجل التاريخي") },
            { key: "partners", label: t("الشركاء والصلاحيات") },
            { key: "inheritance", label: language === "ar" ? "محاكاة الإرث" : "Inheritance simulator" },
          ].map((tItem) => (
            <button
              key={tItem.key}
              onClick={() => setTab(tItem.key as typeof tab)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tItem.key ? "bg-white text-ink-800 shadow-sm" : "text-ink-400 hover:text-ink-600"
              }`}
            >
              {tItem.label}
            </button>
          ))}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setInviteOpen(true)} className="btn-outline text-sm">
              <UserPlus className="h-4 w-4" />
              {t("إضافة شريك")}
            </button>
            <button onClick={() => setTransferOpen(true)} className="btn-brass text-sm">
              <ArrowRightLeft className="h-4 w-4" />
              {t("تحديث الملكية")}
            </button>
          </div>
        )}
      </div>

      {tab === "current" && (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("الشريك")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("النسبة")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("ساري منذ")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ownership.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{o.user.fullName}</p>
                    <p className="text-xs text-ink-400">{o.user.email}</p>
                  </td>
                  <td className="num px-4 py-3 font-semibold text-ink-700">{o.sharePercent}%</td>
                  <td className="px-4 py-3 text-ink-500">{formatDate(o.effectiveFrom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {history === null && <p className="text-sm text-ink-400">{language === "ar" ? "جارٍ التحميل..." : "Loading..."}</p>}
          {history?.map((h) => (
            <div key={h.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-ink-300" />
                <div>
                  <p className="text-sm font-medium text-ink-800">
                    {h.user.fullName} — <span className="num">{h.sharePercent}%</span>
                  </p>
                  <p className="text-xs text-ink-400">
                    {language === "ar"
                      ? `من ${formatDate(h.effectiveFrom)} ${h.effectiveTo ? `إلى ${formatDate(h.effectiveTo)}` : "(حاليًا)"}`
                      : `From ${formatDate(h.effectiveFrom)} ${h.effectiveTo ? `to ${formatDate(h.effectiveTo)}` : "(current)"}`}
                  </p>
                  {h.note && <p className="mt-1 text-xs text-ink-500">{h.note}</p>}
                </div>
              </div>
              {!h.effectiveTo && <StatusBadge label={t("ساري")} tone="sage" />}
            </div>
          ))}
        </div>
      )}

      {tab === "partners" && (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("الشريك")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("الصلاحية")}</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {partners?.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{p.user.fullName}</p>
                    <p className="text-xs text-ink-400">{p.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <select
                        className="input w-44"
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.userId, e.target.value as Role)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(roleLabel[r])}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge label={t(roleLabel[p.role])} tone="neutral" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {propertyId && (
                      <button
                        title={language === "ar" ? "إرسال عبر واتساب" : "Send via WhatsApp"}
                        onClick={async () => {
                          try {
                            const link = await whatsappApi.linkForPartner(
                              propertyId,
                              p.userId,
                              language === "ar" ? "أهلًا، هذه رسالة من قِسمة بخصوص عقارنا المشترك." : "Hi, this is a message from Qisma about our shared property."
                            );
                            window.open(link, "_blank");
                          } catch {
                            /* no phone on file — silently ignore */
                          }
                        }}
                        className="text-ink-300 hover:text-sage-600"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "inheritance" && <InheritanceSimulator />}

      {propertyId && (
        <InvitePartnerModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          propertyId={propertyId}
          onDone={() => {
            setInviteOpen(false);
            loadPartners();
            refresh();
          }}
        />
      )}
      {propertyId && (
        <TransferOwnershipModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          propertyId={propertyId}
          currentOwnership={ownership}
          onDone={() => {
            setTransferOpen(false);
            refresh();
            loadHistory();
          }}
        />
      )}
    </div>
  );
}

function InheritanceSimulator() {
  const { language } = useLanguage();
  const [input, setInput] = useState<InheritanceInput>({
    deceasedGender: "male",
    spouseAlive: true,
    sonsCount: 1,
    daughtersCount: 1,
    fatherAlive: false,
    motherAlive: true,
  });

  const result = calculateInheritance(input);
  const LABELS: Record<string, string> = {
    الزوجة: "Wife", الزوج: "Husband", الأم: "Mother", الأب: "Father", الابن: "Son(s)", الابنة: "Daughter(s)",
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4 text-brass-600" />
          <h3 className="font-display text-base font-semibold text-ink-800">
            {language === "ar" ? "محاكاة قسمة الإرث الشرعي" : "Islamic inheritance simulator"}
          </h3>
        </div>
        <p className="mb-4 text-xs text-ink-400">
          {language === "ar"
            ? "أداة تقديرية للتخطيط العائلي فقط — تغطي الحالات الشائعة (زوج/زوجة، أبناء، والدين). ليست فتوى ولا بديلاً عن محكمة شرعية."
            : "An estimation tool for family planning only — covers common cases (spouse, children, parents). Not a religious ruling nor a substitute for a Sharia court."}
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">{language === "ar" ? "جنس صاحب الحصة" : "Share owner's gender"}</label>
            <select className="input" value={input.deceasedGender} onChange={(e) => setInput({ ...input, deceasedGender: e.target.value as any })}>
              <option value="male">{language === "ar" ? "ذكر" : "Male"}</option>
              <option value="female">{language === "ar" ? "أنثى" : "Female"}</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={input.spouseAlive} onChange={(e) => setInput({ ...input, spouseAlive: e.target.checked })} />
            {language === "ar" ? (input.deceasedGender === "male" ? "الزوجة على قيد الحياة" : "الزوج على قيد الحياة") : "Spouse alive"}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={input.motherAlive} onChange={(e) => setInput({ ...input, motherAlive: e.target.checked })} />
            {language === "ar" ? "الأم على قيد الحياة" : "Mother alive"}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={input.fatherAlive} onChange={(e) => setInput({ ...input, fatherAlive: e.target.checked })} />
            {language === "ar" ? "الأب على قيد الحياة" : "Father alive"}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{language === "ar" ? "عدد الأبناء (ذكور)" : "Number of sons"}</label>
              <input className="input" type="number" min={0} value={input.sonsCount} onChange={(e) => setInput({ ...input, sonsCount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">{language === "ar" ? "عدد البنات" : "Number of daughters"}</label>
              <input className="input" type="number" min={0} value={input.daughtersCount} onChange={(e) => setInput({ ...input, daughtersCount: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-ink-800">{language === "ar" ? "النتيجة التقديرية" : "Estimated result"}</h3>
        <div className="space-y-3">
          {result.shares.map((s, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink-700">
                  {language === "ar" ? s.label : LABELS[s.label] ?? s.label}
                  {s.count > 1 && ` (${s.count})`}
                </span>
                <span className="num font-semibold text-ink-800">{Math.round(s.fraction * 10000) / 100}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brass-400" style={{ width: `${s.fraction * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        {result.needsProfessionalReview && (
          <p className="mt-4 rounded-md bg-clay-50 px-3 py-2 text-xs text-clay-600">
            {result.notes.join(" ")}
          </p>
        )}
        <p className="mt-4 text-xs italic text-ink-400">
          {language === "ar"
            ? "هذا تقدير مبسّط لأشيع الحالات فقط. للحالات الأكثر تعقيدًا (إخوة، أجداد، تعدد زوجات...) يُرجى استشارة جهة شرعية مختصة."
            : "A simplified estimate for the most common cases only. For more complex situations (siblings, grandparents, multiple spouses...) please consult a qualified Sharia authority."}
        </p>
      </div>
    </div>
  );
}

function InvitePartnerModal({
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
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await propertiesApi.invitePartner(propertyId, { email, fullName: fullName || undefined, role });
      setEmail("");
      setFullName("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("إضافة شريك")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{t("البريد الإلكتروني")}</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("الاسم الكامل (إن كان شريكًا جديدًا)")}</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("الصلاحية")}</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(roleLabel[r])}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          <Plus className="h-4 w-4" />
          {t("إضافة")}
        </button>
      </form>
    </Modal>
  );
}

function TransferOwnershipModal({
  open,
  onClose,
  propertyId,
  currentOwnership,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  currentOwnership: OwnershipRecord[];
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState(currentOwnership.map((o) => ({ userId: o.userId, name: o.user.fullName, sharePercent: String(o.sharePercent) })));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows(currentOwnership.map((o) => ({ userId: o.userId, name: o.user.fullName, sharePercent: String(o.sharePercent) })));
  }, [currentOwnership, open]);

  const total = rows.reduce((s, r) => s + (Number(r.sharePercent) || 0), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (Math.round(total * 100) / 100 !== 100) {
      setError(`${t("المجموع:")} ${total}%`);
      return;
    }
    setLoading(true);
    try {
      await ownershipApi.transfer(propertyId, {
        shares: rows.map((r) => ({ userId: r.userId, sharePercent: Number(r.sharePercent) })),
        note: note || undefined,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("تحديث نسب الملكية")} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <p className="text-sm text-ink-500">
          {t(
            "سيتم إغلاق السجل الحالي للملكية وحفظ النسب الجديدة اعتبارًا من اليوم — التاريخ القديم يبقى محفوظًا في السجل التاريخي."
          )}
        </p>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={row.userId} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-ink-700">{row.name}</span>
              <div className="w-28">
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={row.sharePercent}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, sharePercent: e.target.value } : r)))
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <p className={`num text-sm font-semibold ${total === 100 ? "text-sage-600" : "text-clay-500"}`}>
          {t("المجموع:")} {total}%
        </p>
        <div>
          <label className="label">{t("سبب التحديث (اختياري)")}</label>
          <input className="input" placeholder={t("مثال: تسوية إرث، بيع حصة...")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          {t("حفظ التحديث")}
        </button>
      </form>
    </Modal>
  );
}
