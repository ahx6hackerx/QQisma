import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, UserCheck, UserX, Lock, Building2, ShieldAlert, Activity, UserPlus } from "lucide-react";
import { adminApi, AdminStats, AdminUserRow, PlatformSettings } from "../../api/admin";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";
import { Stat } from "../../components/ui/Stat";
import { formatDateTime } from "../../lib/format";
import { StatusPill } from "./shared";

export default function AdminDashboardPage() {
  const [data, setData] = useState<{ stats: AdminStats; recentUsers: AdminUserRow[]; platform: PlatformSettings } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.stats().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <ErrorText message={error} />;
  if (!data) return <PageSpinner />;
  const { stats, recentUsers, platform } = data;
  const disabledCount = Object.keys(platform.disabledFeatures).length;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink-800">لوحة الأدمن</h1>
      <p className="mb-6 text-sm text-ink-400">نظرة عامة على المنصة وأمانها.</p>

      {(platform.maintenanceMode || !platform.registrationOpen || disabledCount > 0) && (
        <div className="mb-6 space-y-2 rounded-lg border border-brass-300 bg-brass-50 p-4 text-sm text-brass-700">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" /> إعدادات طوارئ مفعّلة حاليًا
          </p>
          {platform.maintenanceMode && <p>• وضع الصيانة مفعّل: المستخدمون لا يستطيعون استخدام المنصة.</p>}
          {!platform.registrationOpen && <p>• التسجيل الجديد مغلق.</p>}
          {disabledCount > 0 && <p>• {disabledCount} ميزة معطّلة على مستوى المنصة.</p>}
          <Link to="/admin/security" className="inline-block font-medium underline">
            إدارة الإعدادات
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="إجمالي الحسابات" value={stats.total} icon={<Users className="h-4 w-4" />} />
        <Stat label="حسابات نشطة" value={stats.active} tone="sage" icon={<UserCheck className="h-4 w-4" />} />
        <Stat label="حسابات محظورة" value={stats.suspended} tone="clay" icon={<UserX className="h-4 w-4" />} />
        <Stat label="مقفلة مؤقتًا" value={stats.lockedNow} tone="brass" icon={<Lock className="h-4 w-4" />} hint="بسبب محاولات دخول فاشلة" />
        <Stat label="مالكون" value={stats.owners} />
        <Stat label="وسطاء" value={stats.brokers} />
        <Stat label="عقارات على المنصة" value={stats.properties} icon={<Building2 className="h-4 w-4" />} />
        <Stat label="حسابات عليها قيود" value={stats.usersWithRestrictions} tone="brass" hint="ميزات محجوبة" />
        <Stat label="جدد آخر 7 أيام" value={stats.newLast7Days} icon={<UserPlus className="h-4 w-4" />} />
        <Stat label="جدد آخر 30 يوم" value={stats.newLast30Days} />
        <Stat label="نشطون آخر 7 أيام" value={stats.activeLast7Days} icon={<Activity className="h-4 w-4" />} />
        <Stat label="حسابات محذوفة" value={stats.removed} />
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink-800">أحدث التسجيلات</h2>
          <Link to="/admin/users" className="text-sm text-brass-600 hover:underline">
            كل الحسابات
          </Link>
        </div>
        {recentUsers.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-400">لا توجد حسابات بعد.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {recentUsers.map((u) => (
              <Link key={u.id} to={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">{u.fullName}</p>
                  <p className="truncate text-xs text-ink-400">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={u.status} locked={u.locked} />
                  <span className="hidden text-xs text-ink-400 sm:inline">{formatDateTime(u.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
