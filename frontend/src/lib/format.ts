import { currentLang, t } from "../i18n";
import { CURRENCIES, convertFromJod, currentCurrency } from "../i18n/currency";

// Locale-aware formatting helpers. Amounts stay in Western digits inside a
// .num (LTR, tabular) span so columns of money always align regardless of
// language — dates and month names switch with the active language.

function locale() {
  return currentLang === "en" ? "en-US" : "ar-JO";
}

// `amount` is always the underlying value in JOD (the ledger's base
// currency) — this converts + formats it in whichever currency the user
// has picked (see context/CurrencyContext.tsx).
export function formatMoney(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  const converted = convertFromJod(amount);
  const info = CURRENCIES[currentCurrency];
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: info.decimals,
  }).format(converted);
  return `${formatted} ${info.code}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale(), { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function formatDateShort(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale(), { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function monthLabel(month: number) {
  const names = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  return t(names[month - 1] ?? String(month));
}
