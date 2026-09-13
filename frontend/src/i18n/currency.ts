// ---------------------------------------------------------------------------
// All amounts are stored and calculated in JOD (Jordanian Dinar) throughout
// the backend ledger — that never changes. This module only affects how
// numbers are *displayed*: convert JOD -> selected currency for presentation.
//
// Rates below are fixed approximations (checked ~September 2026) rather
// than a live feed, since a real-time FX API would need a backend proxy.
// They're intentionally easy to find and update in one place later.
// ---------------------------------------------------------------------------

export type CurrencyCode = "JOD" | "USD" | "SAR" | "KWD" | "AED";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  nameEn: string;
  rateFromJod: number; // 1 JOD = rateFromJod units of this currency
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  JOD: { code: "JOD", symbol: "د.أ", nameAr: "دينار أردني", nameEn: "Jordanian Dinar", rateFromJod: 1, decimals: 3 },
  USD: { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar", rateFromJod: 1.41, decimals: 2 },
  SAR: { code: "SAR", symbol: "﷼", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", rateFromJod: 5.29, decimals: 2 },
  KWD: { code: "KWD", symbol: "د.ك", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", rateFromJod: 0.435, decimals: 3 },
  AED: { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", rateFromJod: 5.18, decimals: 2 },
};

export let currentCurrency: CurrencyCode = "JOD";

export function setCurrentCurrency(code: CurrencyCode) {
  currentCurrency = code;
}

export function convertFromJod(amountInJod: number): number {
  return amountInJod * CURRENCIES[currentCurrency].rateFromJod;
}
