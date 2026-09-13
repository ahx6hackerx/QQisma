import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { orgApi, propertiesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorText } from "../../components/ui/ErrorText";
import { Spinner } from "../../components/ui/Spinner";
import type { Organization } from "../../types";

interface ShareRow {
  email: string;
  fullName: string;
  sharePercent: string;
}

export default function CreatePropertyPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [shares, setShares] = useState<ShareRow[]>([{ email: user?.email ?? "", fullName: user?.fullName ?? "", sharePercent: "" }]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    orgApi.list().then((orgs) => {
      setOrganizations(orgs);
      if (orgs.length === 1) setOrganizationId(orgs[0].id);
    });
  }, []);

  async function handleCreateOrg(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatingOrg(true);
    try {
      const org = await orgApi.create(newOrgName);
      setOrganizations((prev) => [...(prev ?? []), { ...org, propertiesCount: 0, role: "OWNER" }]);
      setOrganizationId(org.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingOrg(false);
    }
  }

  function updateShare(index: number, patch: Partial<ShareRow>) {
    setShares((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function addShareRow() {
    setShares((prev) => [...prev, { email: "", fullName: "", sharePercent: "" }]);
  }
  function removeShareRow(index: number) {
    setShares((prev) => prev.filter((_, i) => i !== index));
  }

  const totalPercent = shares.reduce((s, row) => s + (Number(row.sharePercent) || 0), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (Math.round(totalPercent * 100) / 100 !== 100) {
      setError(
        `${t("المجموع:")} ${totalPercent}% — ${language === "ar" ? "المجموع يجب أن يساوي 100%" : "the total must equal 100%"}`
      );
      return;
    }
    setLoading(true);
    try {
      const property = await propertiesApi.create({
        organizationId,
        name,
        address: address || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        ownershipShares: shares.map((s) => ({
          email: s.email,
          fullName: s.fullName || undefined,
          sharePercent: Number(s.sharePercent),
        })),
      });
      navigate(`/app/properties/${property.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!organizations) return null;

  if (organizations.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink-800">{t("قبل أن نبدأ")}</h1>
        <p className="mb-6 text-sm text-ink-400">
          {t("أنشئ مجموعة (عائلة أو مجموعة مستثمرين) لتنظيم عقاراتك المشتركة تحتها.")}
        </p>
        <form onSubmit={handleCreateOrg} className="card space-y-4 p-6">
          <ErrorText message={error} />
          <div>
            <label className="label">{t("اسم المجموعة")}</label>
            <input
              className="input"
              placeholder={t("مثال: عائلة الشريف")}
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
          </div>
          <button className="btn-brass w-full" disabled={creatingOrg}>
            {creatingOrg && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {t("متابعة")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-800">{t("إنشاء عقار جديد")}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ErrorText message={error} />

        <div className="card space-y-4 p-6">
          <h2 className="font-display text-base font-semibold text-ink-800">{t("بيانات العقار")}</h2>

          {organizations.length > 1 && (
            <div>
              <label className="label">{t("المجموعة")}</label>
              <select className="input" required value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                <option value="" disabled>
                  {t("اختر مجموعة")}
                </option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">{t("اسم العقار")}</label>
            <input className="input" placeholder={t("مثال: عمارة النور")} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("العنوان (اختياري)")}</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("القيمة التقديرية JD (اختياري)")}</label>
              <input className="input" type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-800">{t("الشركاء ونسب الملكية")}</h2>
            <span className={`num text-sm font-semibold ${totalPercent === 100 ? "text-sage-600" : "text-clay-500"}`}>
              {t("المجموع:")} {totalPercent}%
            </span>
          </div>

          <div className="space-y-3">
            {shares.map((row, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  {i === 0 && <label className="label">{t("البريد الإلكتروني")}</label>}
                  <input
                    className="input"
                    type="email"
                    placeholder="partner@email.com"
                    required
                    value={row.email}
                    onChange={(e) => updateShare(i, { email: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  {i === 0 && <label className="label">{t("الاسم (إن كان شريكًا جديدًا)")}</label>}
                  <input
                    className="input"
                    placeholder={t("اسم الشريك")}
                    value={row.fullName}
                    onChange={(e) => updateShare(i, { fullName: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  {i === 0 && <label className="label">{t("النسبة %")}</label>}
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={row.sharePercent}
                    onChange={(e) => updateShare(i, { sharePercent: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeShareRow(i)}
                  disabled={shares.length === 1}
                  className="btn-ghost h-10 w-10 shrink-0 p-0 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addShareRow} className="btn-outline">
            <Plus className="h-4 w-4" />
            {t("إضافة شريك")}
          </button>
        </div>

        <button className="btn-brass w-full" disabled={loading || !organizationId}>
          {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
          {t("إنشاء العقار")}
        </button>
      </form>
    </div>
  );
}
