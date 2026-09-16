import type { Tone } from "../../lib/status";
import type { LeadStatus, ListingStatus, ListingType } from "../../types";

export const LEAD_STATUS_LABELS: Record<LeadStatus, { ar: string; en: string; tone: Tone }> = {
  NEW: { ar: "جديد", en: "New", tone: "neutral" },
  CONTACTED: { ar: "تم التواصل", en: "Contacted", tone: "brass" },
  VIEWING_SCHEDULED: { ar: "موعد معاينة", en: "Viewing scheduled", tone: "brass" },
  NEGOTIATING: { ar: "قيد التفاوض", en: "Negotiating", tone: "brass" },
  WON: { ar: "تم الإغلاق", en: "Won", tone: "sage" },
  LOST: { ar: "خسارة", en: "Lost", tone: "clay" },
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, { ar: string; en: string; tone: Tone }> = {
  AVAILABLE: { ar: "متاح", en: "Available", tone: "sage" },
  RESERVED: { ar: "محجوز", en: "Reserved", tone: "brass" },
  SOLD: { ar: "مباع", en: "Sold", tone: "ink" },
  RENTED: { ar: "مؤجَّر", en: "Rented", tone: "ink" },
  WITHDRAWN: { ar: "مسحوب", en: "Withdrawn", tone: "clay" },
};

export const LISTING_TYPE_LABELS: Record<ListingType, { ar: string; en: string }> = {
  SALE: { ar: "للبيع", en: "For sale" },
  RENT: { ar: "للإيجار", en: "For rent" },
};
