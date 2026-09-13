import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { History, Plus, UserPlus, ArrowRightLeft } from "lucide-react";
import { ownershipApi, propertiesApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { roleLabel } from "../../lib/status";
import { formatDate } from "../../lib/format";
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
  const [tab, setTab] = useState<"current" | "history" | "partners">("current");

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
