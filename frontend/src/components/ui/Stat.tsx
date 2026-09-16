import { ReactNode } from "react";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "sage" | "clay" | "brass";
  icon?: ReactNode;
}) {
  const valueColor =
    tone === "sage" ? "text-sage-600" : tone === "clay" ? "text-clay-500" : tone === "brass" ? "text-brass-600" : "text-ink-800";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-400">{label}</p>
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <p className={`num mt-2 text-2xl font-semibold ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
