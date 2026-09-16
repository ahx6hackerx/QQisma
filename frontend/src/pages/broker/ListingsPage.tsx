import { FormEvent, useEffect, useState } from "react";
import { Plus, Building2, Bed, Bath, Ruler, Users } from "lucide-react";
import { brokerApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ErrorText } from "../../components/ui/ErrorText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { formatMoney } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import { LISTING_STATUS_LABELS, LISTING_TYPE_LABELS } from "./leadStatus";
import type { Listing, ListingStatus, ListingType } from "../../types";

const PROPERTY_TYPES_AR = ["شقة", "فيلا", "أرض", "محل تجاري", "مكتب", "مستودع"];
const PROPERTY_TYPES_EN = ["Apartment", "Villa", "Land", "Retail shop", "Office", "Warehouse"];

export default function ListingsPage() {
  const { language } = useLanguage();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);

  function load() {
    brokerApi.listings.list(statusFilter ? { status: statusFilter } : undefined).then(setListings);
  }
  useEffect(load, [statusFilter]);

  if (!listings) return <PageSpinner />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ListingStatus | "")}>
          <option value="">{language === "ar" ? "كل الحالات" : "All statuses"}</option>
          {Object.entries(LISTING_STATUS_LABELS).map(([key, v]) => (
            <option key={key} value={key}>
              {language === "ar" ? v.ar : v.en}
            </option>
          ))}
        </select>
        <button onClick={() => setCreateOpen(true)} className="btn-brass text-sm">
          <Plus className="h-4 w-4" />
          {language === "ar" ? "إعلان جديد" : "New listing"}
        </button>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={language === "ar" ? "لا توجد إعلانات بعد" : "No listings yet"}
          description={language === "ar" ? "أضف أول عقار تسوّقه لعملائك." : "Add the first property you're marketing to clients."}
          action={
            <button onClick={() => setCreateOpen(true)} className="btn-brass">
              <Plus className="h-4 w-4" />
              {language === "ar" ? "إعلان جديد" : "New listing"}
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((l) => {
            const s = LISTING_STATUS_LABELS[l.status];
            const t = LISTING_TYPE_LABELS[l.listingType];
            return (
              <button key={l.id} onClick={() => setEditing(l)} className="card p-4 text-start transition-shadow hover:shadow-md">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold text-ink-800">{l.title}</p>
                  <StatusBadge label={language === "ar" ? s.ar : s.en} tone={s.tone} />
                </div>
                <p className="mb-2 text-xs text-ink-400">
                  {l.propertyType} — {language === "ar" ? t.ar : t.en}
                  {l.city && ` — ${l.city}`}
                </p>
                <p className="num mb-3 text-lg font-bold text-brass-600">{formatMoney(l.price)}</p>
                <div className="flex items-center gap-3 text-xs text-ink-400">
                  {l.bedrooms != null && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" /> {l.bedrooms}
                    </span>
                  )}
                  {l.bathrooms != null && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" /> {l.bathrooms}
                    </span>
                  )}
                  {l.areaSqm != null && (
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3.5 w-3.5" /> {l.areaSqm} m²
                    </span>
                  )}
                  <span className="mr-auto flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {l._count?.leads ?? 0}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ListingFormModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); }} />
      {editing && (
        <ListingFormModal
          open
          listing={editing}
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

function ListingFormModal({
  open,
  onClose,
  onDone,
  listing,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  listing?: Listing;
}) {
  const { language } = useLanguage();
  const propertyTypes = language === "ar" ? PROPERTY_TYPES_AR : PROPERTY_TYPES_EN;
  const [title, setTitle] = useState(listing?.title ?? "");
  const [propertyType, setPropertyType] = useState(listing?.propertyType ?? propertyTypes[0]);
  const [listingType, setListingType] = useState<ListingType>(listing?.listingType ?? "SALE");
  const [price, setPrice] = useState(listing ? String(listing.price) : "");
  const [city, setCity] = useState(listing?.city ?? "");
  const [address, setAddress] = useState(listing?.address ?? "");
  const [bedrooms, setBedrooms] = useState(listing?.bedrooms != null ? String(listing.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(listing?.bathrooms != null ? String(listing.bathrooms) : "");
  const [areaSqm, setAreaSqm] = useState(listing?.areaSqm != null ? String(listing.areaSqm) : "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [status, setStatus] = useState<ListingStatus>(listing?.status ?? "AVAILABLE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      title,
      propertyType,
      listingType,
      price: Number(price),
      city: city || undefined,
      address: address || undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      areaSqm: areaSqm ? Number(areaSqm) : undefined,
      description: description || undefined,
      ...(listing ? { status } : {}),
    };
    try {
      if (listing) {
        await brokerApi.listings.update(listing.id, payload);
      } else {
        await brokerApi.listings.create(payload);
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!listing) return;
    if (!confirm(language === "ar" ? "هل تريد حذف هذا الإعلان؟" : "Delete this listing?")) return;
    await brokerApi.listings.remove(listing.id);
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title={listing ? (language === "ar" ? "تعديل الإعلان" : "Edit listing") : language === "ar" ? "إعلان جديد" : "New listing"} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText message={error} />
        <div>
          <label className="label">{language === "ar" ? "عنوان الإعلان" : "Listing title"}</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{language === "ar" ? "نوع العقار" : "Property type"}</label>
            <select className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              {propertyTypes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{language === "ar" ? "بيع أو إيجار" : "Sale or rent"}</label>
            <select className="input" value={listingType} onChange={(e) => setListingType(e.target.value as ListingType)}>
              <option value="SALE">{language === "ar" ? "للبيع" : "For sale"}</option>
              <option value="RENT">{language === "ar" ? "للإيجار" : "For rent"}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{language === "ar" ? "السعر (JOD)" : "Price (JOD)"}</label>
            <input className="input" type="number" required min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "المدينة" : "City"}</label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{language === "ar" ? "العنوان التفصيلي (اختياري)" : "Detailed address (optional)"}</label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">{language === "ar" ? "غرف النوم" : "Bedrooms"}</label>
            <input className="input" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "الحمامات" : "Bathrooms"}</label>
            <input className="input" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "المساحة m²" : "Area m²"}</label>
            <input className="input" type="number" min={0} value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} />
          </div>
        </div>
        {listing && (
          <div>
            <label className="label">{language === "ar" ? "الحالة" : "Status"}</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
              {Object.entries(LISTING_STATUS_LABELS).map(([key, v]) => (
                <option key={key} value={key}>
                  {language === "ar" ? v.ar : v.en}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">{language === "ar" ? "وصف (اختياري)" : "Description (optional)"}</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn-brass flex-1" disabled={loading}>
            {language === "ar" ? "حفظ" : "Save"}
          </button>
          {listing && (
            <button type="button" onClick={handleDelete} className="btn-danger">
              {language === "ar" ? "حذف" : "Delete"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
