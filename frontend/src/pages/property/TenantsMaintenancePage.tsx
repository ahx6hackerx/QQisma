import { FormEvent, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Plus, Users, Wrench, Contact, Copy, Check, ExternalLink } from "lucide-react";
import { tenantsApi, vendorsApi, maintenanceApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateShort } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PropertyContext } from "../../components/layout/PropertyLayout";
import type { MaintenanceRequest, MaintenanceStatus, Tenant, Vendor } from "../../types";

const MAINT_LABELS: Record<MaintenanceStatus, { ar: string; en: string; tone: "neutral" | "brass" | "sage" | "clay" }> = {
  OPEN: { ar: "مفتوح", en: "Open", tone: "clay" },
  QUOTED: { ar: "تم عرض السعر", en: "Quoted", tone: "brass" },
  APPROVED: { ar: "معتمد", en: "Approved", tone: "brass" },
  DONE: { ar: "منجَز", en: "Done", tone: "sage" },
  CANCELLED: { ar: "ملغى", en: "Cancelled", tone: "neutral" },
};

export default function TenantsMaintenancePage() {
  const { myRole } = useOutletContext<PropertyContext>();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { language } = useLanguage();
  const [tab, setTab] = useState<"tenants" | "maintenance" | "vendors">("tenants");
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[] | null>(null);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManage = ["OWNER", "MANAGER"].includes(myRole);

  function loadAll() {
    if (!propertyId) return;
    tenantsApi.list(propertyId).then(setTenants);
    maintenanceApi.list(propertyId).then(setRequests);
    vendorsApi.list(propertyId).then(setVendors);
  }
  useEffect(loadAll, [propertyId]);

  function copyLink(tenant: Tenant) {
    const url = `${window.location.origin}${tenant.portalPath}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(tenant.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function assignVendor(requestId: string, vendorId: string) {
    if (!propertyId) return;
    await maintenanceApi.update(propertyId, requestId, { vendorId: vendorId || null });
    loadAll();
  }
  async function updateStatus(requestId: string, status: MaintenanceStatus) {
    if (!propertyId) return;
    await maintenanceApi.update(propertyId, requestId, { status });
    loadAll();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-ink-100 p-1">
          <button onClick={() => setTab("tenants")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${tab === "tenants" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}>
            <Users className="h-3.5 w-3.5" />
            {language === "ar" ? "المستأجرون" : "Tenants"}
          </button>
          <button onClick={() => setTab("maintenance")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${tab === "maintenance" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}>
            <Wrench className="h-3.5 w-3.5" />
            {language === "ar" ? "طلبات الصيانة" : "Maintenance"}
          </button>
          <button onClick={() => setTab("vendors")} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${tab === "vendors" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}>
            <Contact className="h-3.5 w-3.5" />
            {language === "ar" ? "دليل المزوّدين" : "Vendors"}
          </button>
        </div>
        {canManage && tab === "tenants" && (
          <button onClick={() => setTenantModalOpen(true)} className="btn-brass text-sm">
            <Plus className="h-4 w-4" />
            {language === "ar" ? "إضافة مستأجر" : "Add tenant"}
          </button>
        )}
        {canManage && tab === "vendors" && (
          <button onClick={() => setVendorModalOpen(true)} className="btn-brass text-sm">
            <Plus className="h-4 w-4" />
            {language === "ar" ? "إضافة مزوّد" : "Add vendor"}
          </button>
        )}
      </div>

      {tab === "tenants" &&
        (tenants?.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={language === "ar" ? "لا يوجد مستأجرون بعد" : "No tenants yet"}
            description={language === "ar" ? "أضف مستأجرًا واحصل على رابط بوابة خاص به لمتابعة دفعاته." : "Add a tenant and get their own portal link to track their payments."}
          />
        ) : (
          <div className="space-y-3">
            {tenants?.map((tn) => (
              <div key={tn.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-ink-800">
                    {tn.fullName} — <span className="text-ink-400">{tn.unitLabel}</span>
                  </p>
                  <p className="text-xs text-ink-400">
                    {tn.phone ?? "—"} · {tn._count?.transactions ?? 0} {language === "ar" ? "عملية" : "transactions"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={tn.portalPath} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {language === "ar" ? "فتح البوابة" : "Open portal"}
                  </a>
                  <button onClick={() => copyLink(tn)} className="btn-outline text-xs">
                    {copiedId === tn.id ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {language === "ar" ? "نسخ الرابط" : "Copy link"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "maintenance" &&
        (requests?.length === 0 ? (
          <EmptyState icon={<Wrench className="h-8 w-8" />} title={language === "ar" ? "لا توجد طلبات صيانة" : "No maintenance requests"} />
        ) : (
          <div className="space-y-3">
            {requests?.map((r) => {
              const s = MAINT_LABELS[r.status];
              return (
                <div key={r.id} className="card p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-800">{r.title}</p>
                      {r.description && <p className="mt-0.5 text-sm text-ink-500">{r.description}</p>}
                      <p className="mt-1 text-xs text-ink-400">
                        {r.tenant ? `${r.tenant.fullName} (${r.tenant.unitLabel})` : language === "ar" ? "بلاغ من الإدارة" : "Reported internally"} —{" "}
                        {formatDateShort(r.createdAt)}
                      </p>
                    </div>
                    <StatusBadge label={language === "ar" ? s.ar : s.en} tone={s.tone} />
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                      <select
                        className="input w-auto text-xs"
                        value={r.vendor?.id ?? ""}
                        onChange={(e) => assignVendor(r.id, e.target.value)}
                      >
                        <option value="">{language === "ar" ? "بدون مزوّد" : "No vendor"}</option>
                        {vendors?.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                      <select className="input w-auto text-xs" value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as MaintenanceStatus)}>
                        {Object.entries(MAINT_LABELS).map(([key, v]) => (
                          <option key={key} value={key}>
                            {language === "ar" ? v.ar : v.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {tab === "vendors" &&
        (vendors?.length === 0 ? (
          <EmptyState
            icon={<Contact className="h-8 w-8" />}
            title={language === "ar" ? "لا يوجد مزوّدون بعد" : "No vendors yet"}
            description={language === "ar" ? "أضف أول مزوّد صيانة موثوق لبناء دليلك الخاص تدريجيًا." : "Add your first trusted maintenance provider to start building your own directory."}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {vendors?.map((v) => (
              <div key={v.id} className="card p-4">
                <p className="font-medium text-ink-800">{v.name}</p>
                <p className="text-xs text-ink-400">{v.specialty ?? "—"} {v.phone && `· ${v.phone}`}</p>
                {v.notes && <p className="mt-2 text-sm text-ink-500">{v.notes}</p>}
                <p className="mt-2 text-xs text-ink-300">
                  {v._count?.requests ?? 0} {language === "ar" ? "طلب سابق" : "past requests"}
                </p>
              </div>
            ))}
          </div>
        ))}

      {propertyId && (
        <AddTenantModal open={tenantModalOpen} propertyId={propertyId} onClose={() => setTenantModalOpen(false)} onDone={() => { setTenantModalOpen(false); loadAll(); }} />
      )}
      {propertyId && (
        <AddVendorModal open={vendorModalOpen} propertyId={propertyId} onClose={() => setVendorModalOpen(false)} onDone={() => { setVendorModalOpen(false); loadAll(); }} />
      )}
    </div>
  );
}

function AddTenantModal({ open, onClose, onDone, propertyId }: { open: boolean; onClose: () => void; onDone: () => void; propertyId: string }) {
  const { language } = useLanguage();
  const [unitLabel, setUnitLabel] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await tenantsApi.create(propertyId, { unitLabel, fullName, phone: phone || undefined });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={language === "ar" ? "إضافة مستأجر" : "Add tenant"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{language === "ar" ? "رقم/اسم الوحدة" : "Unit label"}</label>
          <input className="input" required placeholder={language === "ar" ? "مثال: وحدة 101" : "e.g. Unit 101"} value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} />
        </div>
        <div>
          <label className="label">{language === "ar" ? "اسم المستأجر" : "Tenant name"}</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">{language === "ar" ? "رقم الهاتف (اختياري)" : "Phone (optional)"}</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          {language === "ar" ? "إضافة" : "Add"}
        </button>
      </form>
    </Modal>
  );
}

function AddVendorModal({ open, onClose, onDone, propertyId }: { open: boolean; onClose: () => void; onDone: () => void; propertyId: string }) {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await vendorsApi.create(propertyId, { name, phone: phone || undefined, specialty: specialty || undefined, notes: notes || undefined });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={language === "ar" ? "إضافة مزوّد" : "Add vendor"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{language === "ar" ? "الاسم" : "Name"}</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{language === "ar" ? "التخصص" : "Specialty"}</label>
            <input className="input" placeholder={language === "ar" ? "كهرباء، سباكة..." : "Electrical, plumbing..."} value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "رقم الهاتف" : "Phone"}</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{language === "ar" ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn-brass w-full" disabled={loading}>
          {language === "ar" ? "إضافة" : "Add"}
        </button>
      </form>
    </Modal>
  );
}
