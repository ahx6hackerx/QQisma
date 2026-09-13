import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CurrencyCode, CURRENCIES, setCurrentCurrency } from "../i18n/currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function getInitial(): CurrencyCode {
  const stored = localStorage.getItem("qisma_currency");
  return stored && stored in CURRENCIES ? (stored as CurrencyCode) : "JOD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getInitial);

  useEffect(() => {
    setCurrentCurrency(currency);
    localStorage.setItem("qisma_currency", currency);
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: setCurrencyState }}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
