import { FormEvent, useEffect, useState } from "react";
import { Plus, Users, Phone, Mail, LayoutGrid, List, Clock, Send } from "lucide-react";
import { brokerApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { formatMoney, formatDateShort, formatDateTime } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import { LEAD_STATUS_LABELS } from "./leadStatus";
import type { Lead, LeadStatus, Listing } from "../../types";

const BOARD_COLUMNS: LeadStatus[] = ["NEW", "CONTACTED", "VIEWING_SCHEDULED", "NEGOTIATING", "WON", "LOST"];

function isOverdue(lead: Lead) {
  if (!lead.nextFollowUpAt || lead.status === "WON" || lead.status === "LOST") return false;
  return new Date(lead.nextFollowUpAt) <= new Date();
}

export default function LeadsPage() {
  const { language } = useLanguage();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [view, setView] = useState<"table" | "board">("board");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    brokerApi.leads.list(statusFilter ? { status: statusFilter } : undefined).then(setLeads);
  }
  useEffect(load, [statusFilter]);
  useEffect(() => {
    brokerApi.listings.list().then(setListings);
  }, []);

  async function handleStatusChange(leadId: string, status: LeadStatus) {
    await brokerApi.leads.update(leadId, { status });
    load();
  }

  if (!leads) return <PageSpinner />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-md bg-ink-100 p-1">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${view === "board" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {language === "ar" ? "لوحة" : "Board"}
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${view === "table" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400"}`}
            >
              <List className="h-3.5 w-3.5" />
              {language === "ar" ? "جدول" : "Table"}
            </button>
          </div>
          {view === "table" && (
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}>
              <option value="">{language === "ar" ? "كل الحالات" : "All statuses"}</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([key, v]) => (
                <option key={key} value={key}>
                  {language === "ar" ? v.ar : v.en}
                </option>
              ))}
            </select>
          )}
        </div>
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
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {BOARD_COLUMNS.map((col) => {
            const colLabel = LEAD_STATUS_LABELS[col];
            const colLeads = leads.filter((l) => l.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) handleStatusChange(id, col);
                }}
                className="w-64 shrink-0 rounded-lg bg-parchment-200 p-2"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-ink-600">{language === "ar" ? colLabel.ar : colLabel.en}</p>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink-500">{colLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
                      onClick={() => setEditingId(lead.id)}
                      className="cursor-grab rounded-md border border-ink-100 bg-white p-3 text-sm shadow-card active:cursor-grabbing"
                    >
                      <p className="font-medium text-ink-800">{lead.fullName}</p>
                      {lead.listing && <p className="mt-0.5 truncate text-xs text-ink-400">{lead.listing.title}</p>}
                      {(lead.budgetMin || lead.budgetMax) && (
                        <p className="num mt-1 text-xs text-brass-600">
                          {lead.budgetMin ? formatMoney(lead.budgetMin) : "—"} – {lead.budgetMax ? formatMoney(lead.budgetMax) : "—"}
                        </p>
                      )}
                      {lead.nextFollowUpAt && (
                        <p className={`mt-1 flex items-center gap-1 text-[11px] ${isOverdue(lead) ? "text-clay-500" : "text-ink-400"}`}>
                          <Clock className="h-3 w-3" />
                          {formatDateShort(lead.nextFollowUpAt)}
                        </p>
                      )}
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <p className="px-1 py-3 text-center text-[11px] text-ink-300">
                      {language === "ar" ? "لا يوجد" : "Empty"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "العميل" : "Client"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "الإعلان المرتبط" : "Linked listing"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "الميزانية" : "Budget"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "المتابعة القادمة" : "Next follow-up"}</th>
                <th className="px-4 py-3 text-start font-medium">{language === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {leads.map((lead) => {
                const s = LEAD_STATUS_LABELS[lead.status];
                return (
                  <tr key={lead.id} className="cursor-pointer hover:bg-parchment-50" onClick={() => setEditingId(lead.id)}>
                    <td className="px-4 py-3">
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
                    <td className={`px-4 py-3 ${isOverdue(lead) ? "font-medium text-clay-500" : "text-ink-500"}`}>
                      {lead.nextFollowUpAt ? formatDateShort(lead.nextFollowUpAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
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
      {editingId && (
        <LeadFormModal
          open
          leadId={editingId}
          listings={listings}
          onClose={() => setEditingId(null)}
          onDone={() => {
            setEditingId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function LeadFormModal({
  open,
  onClose,
  onDone,
  leadId,
  listings,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  leadId?: string;
  listings: Listing[];
}) {
  const { language } = useLanguage();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loadingLead, setLoadingLead] = useState(!!leadId);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [listingId, setListingId] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setLoadingLead(true);
    brokerApi.leads.get(leadId).then((l: Lead) => {
      setLead(l);
      setFullName(l.fullName);
      setPhone(l.phone ?? "");
      setEmail(l.email ?? "");
      setBudgetMin(l.budgetMin != null ? String(l.budgetMin) : "");
      setBudgetMax(l.budgetMax != null ? String(l.budgetMax) : "");
      setListingId(l.listingId ?? "");
      setNotes(l.notes ?? "");
      setNextFollowUpAt(toDateInputValue(l.nextFollowUpAt));
      setLoadingLead(false);
    });
  }, [leadId]);

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
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
    };
    try {
      if (leadId) {
        await brokerApi.leads.update(leadId, payload);
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
    if (!leadId) return;
    if (!confirm(language === "ar" ? "هل تريد حذف هذا العميل المحتمل؟" : "Delete this lead?")) return;
    await brokerApi.leads.remove(leadId);
    onDone();
  }

  async function handleAddNote() {
    if (!leadId || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const note = await brokerApi.leads.addNote(leadId, newNote.trim());
      setLead((prev) => (prev ? { ...prev, activity: [note, ...(prev.activity ?? [])] } : prev));
      setNewNote("");
    } finally {
      setAddingNote(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={leadId ? (language === "ar" ? "تعديل العميل المحتمل" : "Edit lead") : language === "ar" ? "عميل محتمل جديد" : "New lead"} wide>
      {loadingLead ? (
        <PageSpinner />
      ) : (
        <div className="space-y-5">
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
            <div className="grid grid-cols-2 gap-4">
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
                <label className="label">
                  <Clock className="me-1 inline h-3.5 w-3.5" />
                  {language === "ar" ? "تاريخ المتابعة القادمة" : "Next follow-up date"}
                </label>
                <input className="input" type="date" value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">{language === "ar" ? "ملاحظات عامة (اختياري)" : "General notes (optional)"}</label>
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn-brass flex-1" disabled={loading}>
                {language === "ar" ? "حفظ" : "Save"}
              </button>
              {leadId && (
                <button type="button" onClick={handleDelete} className="btn-danger">
                  {language === "ar" ? "حذف" : "Delete"}
                </button>
              )}
            </div>
          </form>

          {leadId && (
            <div className="border-t border-ink-100 pt-4">
              <h4 className="mb-2 text-sm font-semibold text-ink-700">
                {language === "ar" ? "سجل المتابعة" : "Interaction timeline"}
              </h4>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={language === "ar" ? "أضف ملاحظة: مكالمة، معاينة، عرض..." : "Add a note: call, viewing, offer..."}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNote())}
                />
                <button type="button" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="btn-outline shrink-0 text-sm">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {(lead?.activity ?? []).length === 0 && (
                  <p className="text-xs text-ink-400">{language === "ar" ? "لا توجد ملاحظات بعد." : "No notes yet."}</p>
                )}
                {lead?.activity?.map((note) => (
                  <div key={note.id} className="rounded-md bg-parchment-100 px-3 py-2 text-sm">
                    <p className="text-ink-700">{note.message}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{formatDateTime(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
