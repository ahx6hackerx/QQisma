import { FormEvent, useEffect, useState } from "react";
import { Plus, Users, Phone, Mail } from "lucide-react";
import { brokerApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { formatMoney, formatDateShort } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import { LEAD_STATUS_LABELS } from "./leadStatus";
import type { Lead, LeadStatus, Listing } from "../../types";

export default function LeadsPage() {
  const { language } = useLanguage();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  function load() {
    brokerApi.leads.list(statusFilter ? { status: statusFilter } : undefined).then(setLeads);
  }
  useEffect(load, [statusFilter]);
  useEffect(() => {
    brokerApi.listings.list().then(setListings);
  }, []);

  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    await brokerApi.leads.update(lead.id, { status });
    load();
  }

  if (!leads) return <PageSpinner />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}>
          <option value="">{language === "ar" ? "كل الحالات" : "All statuses"}</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([key, v]) => (
            <option key={key} value={key}>
              {language === "ar" ? v.ar : v.en}
            </option>
          ))}
        </select>
        <button onClick={() => setCreateOpen(true)} className="btn-brass text-sm">
          <Plus className="h-4 w-4" />
          {language === "ar" ? "عميل محتمل جديد" : "New lead"}
        </button>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={language === "ar" ? "لا يوجد عملاء محتملون بعد" : "No leads yet"}
          description={language === "ar" ? "أضف أول عميل مهتم بأحد إعلاناتك." : "Add the first buyer interested in one of your listings."}
          action={
            <button onClick={() => setCreateOpen(true)} className="btn-brass">
              <Plus className="h-4 w-4" />
              {language === "ar" ? "عميل محتمل جديد" : "New lead"}
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "العميل" : "Client"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "الإعلان المرتبط" : "Linked listing"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "الميزانية" : "Budget"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {leads.map((lead) => {
                const s = LEAD_STATUS_LABELS[lead.status];
                return (
                  <tr key={lead.id} className="hover:bg-parchment-50">
                    <td className="cursor-pointer px-4 py-3" onClick={() => setEditing(lead)}>
                      <p className="font-medium text-ink-800">{lead.fullName}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-400">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{lead.listing?.title ?? "—"}</td>
                    <td className="num px-4 py-3 text-ink-600">
                      {lead.budgetMin || lead.budgetMax
                        ? `${lead.budgetMin ? formatMoney(lead.budgetMin) : "—"} – ${lead.budgetMax ? formatMoney(lead.budgetMax) : "—"}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full border-0 bg-transparent text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brass-400"
                      >
                        {Object.entries(LEAD_STATUS_LABELS).map(([key, v]) => (
                          <option key={key} value={key}>
                            {language === "ar" ? v.ar : v.en}
                          </option>
                        ))}
                      </select>
                      <StatusBadge label={language === "ar" ? s.ar : s.en} tone={s.tone} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LeadFormModal open={createOpen} listings={listings} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); }} />
      {editing && (
        <LeadFormModal
          open
          lead={editing}
          listings={listings}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function LeadFormModal({
  open,
  onClose,
  onDone,
  lead,
  listings,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  lead?: Lead;
  listings: Listing[];
}) {
  const { language } = useLanguage();
  const [fullName, setFullName] = useState(lead?.fullName ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [budgetMin, setBudgetMin] = useState(lead?.budgetMin != null ? String(lead.budgetMin) : "");
  const [budgetMax, setBudgetMax] = useState(lead?.budgetMax != null ? String(lead.budgetMax) : "");
  const [listingId, setListingId] = useState(lead?.listingId ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      fullName,
      phone: phone || undefined,
      email: email || undefined,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      listingId: listingId || undefined,
      notes: notes || undefined,
    };
    try {
      if (lead) {
        await brokerApi.leads.update(lead.id, payload);
      } else {
        await brokerApi.leads.create(payload);
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (!confirm(language === "ar" ? "هل تريد حذف هذا العميل المحتمل؟" : "Delete this lead?")) return;
    await brokerApi.leads.remove(lead.id);
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title={lead ? (language === "ar" ? "تعديل العميل المحتمل" : "Edit lead") : language === "ar" ? "عميل محتمل جديد" : "New lead"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{language === "ar" ? "اسم العميل" : "Client name"}</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{language === "ar" ? "رقم الهاتف" : "Phone"}</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "البريد الإلكتروني" : "Email"}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{language === "ar" ? "الميزانية من (JOD)" : "Budget from (JOD)"}</label>
            <input className="input" type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "الميزانية إلى (JOD)" : "Budget to (JOD)"}</label>
            <input className="input" type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{language === "ar" ? "الإعلان المهتم به (اختياري)" : "Interested listing (optional)"}</label>
          <select className="input" value={listingId} onChange={(e) => setListingId(e.target.value)}>
            <option value="">{language === "ar" ? "بدون ربط" : "Not linked"}</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{language === "ar" ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn-brass flex-1" disabled={loading}>
            {language === "ar" ? "حفظ" : "Save"}
          </button>
          {lead && (
            <button type="button" onClick={handleDelete} className="btn-danger">
              {language === "ar" ? "حذف" : "Delete"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
