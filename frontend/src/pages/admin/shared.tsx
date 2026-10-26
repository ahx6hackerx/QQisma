import type { UserStatus } from "../../api/admin";

export function StatusPill({ status, locked }: { status: UserStatus; locked?: boolean }) {
  if (locked && status === "ACTIVE") {
    return <span className="inline-flex rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-medium text-brass-700">مقفل مؤقتًا</span>;
  }
  const map: Record<UserStatus, { label: string; cls: string }> = {
    ACTIVE: { label: "نشط", cls: "bg-sage-100 text-sage-600" },
    SUSPENDED: { label: "محظور", cls: "bg-clay-100 text-clay-600" },
    REMOVED: { label: "محذوف", cls: "bg-ink-100 text-ink-500" },
  };
  const s = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export const ACTION_LABELS: Record<string, string> = {
  USER_BAN: "حظر حساب",
  USER_UNBAN: "رفع الحظر",
  USER_REMOVE: "إزالة حساب",
  USER_RESET_PASSWORD: "تغيير كلمة سر",
  USER_FORCE_LOGOUT: "تسجيل خروج إجباري",
  USER_UNLOCK: "فك قفل حساب",
  FEATURE_DISABLE: "حجب ميزة",
  FEATURE_ENABLE: "إتاحة ميزة",
  PLATFORM_UPDATE: "تعديل إعدادات المنصة",
  FORCE_LOGOUT_ALL: "تسجيل خروج للجميع",
  ANNOUNCEMENT_SEND: "إرسال تعميم",
};
