import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, ChevronLeft, ShieldCheck } from "lucide-react";
import { adminApi, AdminUserRow } from "../../api/admin";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../lib/format";
import { StatusPill } from "./shared";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [accountType, setAccountType] = useState("");
  const [lockedOnly, setLockedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ users: AdminUserRow[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // debounce the search box
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setData(null);
    adminApi
      .users({
        search: query || undefined,
        status: status || undefined,
        accountType: accountType || undefined,
        locked: lockedOnly || undefined,
        page,
      })
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [query, status, accountType, lockedOnly, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink-800">الحسابات</h1>
      <p className="mb-6 text-sm text-ink-400">اضغط على أي حساب لإدارته: حظر، إزالة، تغيير كلمة السر، أو التحكم بالميزات.</p>

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">بحث</label>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-ink-300" />
            <input className="input pr-9" placeholder="الاسم أو البريد أو الهاتف" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">الحالة</label>
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">الفعّالة والمحظورة</option>
            <option value="ACTIVE">نشط</option>
            <option value="SUSPENDED">محظور</option>
            <option value="REMOVED">محذوف</option>
            <option value="ALL">الكل</option>
          </select>
        </div>
        <div>
          <label className="label">نوع الحساب</label>
          <select className="input" value={accountType} onChange={(e) => { setAccountType(e.target.value); setPage(1); }}>
            <option value="">الكل</option>
            <option value="OWNER">مالك</option>
            <option value="BROKER">وسيط</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink-600">
          <input type="checkbox" checked={lockedOnly} onChange={(e) => { setLockedOnly(e.target.checked); setPage(1); }} />
          المقفلة فقط
        </label>
      </div>

      <ErrorText message={error} />
      {!data ? (
        <PageSpinner />
      ) : data.users.length === 0 ? (
        <EmptyState title="لا توجد حسابات مطابقة" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-xs text-ink-400">
                <th className="px-4 py-3 font-medium">الحساب</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">العقارات</th>
                <th className="px-4 py-3 font-medium">قيود</th>
                <th className="px-4 py-3 font-medium">آخر دخول</th>
                <th className="px-4 py-3 font-medium">التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${u.id}`} className="block">
                      <span className="flex items-center gap-1.5 font-medium text-ink-800">
                        {u.fullName}
                        {u.isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-brass-500" />}
                      </span>
                      <span className="text-xs text-ink-400">{u.email}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{u.accountType === "BROKER" ? "وسيط" : "مالك"}</td>
                  <td className="px-4 py-3"><StatusPill status={u.status} locked={u.locked} /></td>
                  <td className="num px-4 py-3 text-ink-600">{u.propertiesCount}</td>
                  <td className="num px-4 py-3 text-ink-600">{u.restrictionsCount || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "لم يدخل بعد"}</td>
                  <td className="px-4 py-3 text-xs text-ink-500">{formatDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>{data.total} حساب</span>
          <div className="flex items-center gap-2">
            <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight className="h-4 w-4" /> السابق
            </button>
            <span>{page} / {totalPages}</span>
            <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              التالي <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
