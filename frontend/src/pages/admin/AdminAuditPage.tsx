import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { adminApi, AdminLogRow } from "../../api/admin";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../lib/format";
import { ACTION_LABELS } from "./shared";

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ logs: AdminLogRow[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    adminApi.auditLog(page).then(setData).catch((e) => setError((e as Error).message));
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink-800">سجل عمليات الأدمن</h1>
      <p className="mb-6 text-sm text-ink-400">كل إجراء إداري يُسجَّل هنا ولا يمكن تعديله.</p>
      <ErrorText message={error} />
      {!data ? (
        <PageSpinner />
      ) : data.logs.length === 0 ? (
        <EmptyState title="لا توجد عمليات مسجّلة" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-xs text-ink-400">
                <th className="px-4 py-3 font-medium">الوقت</th>
                <th className="px-4 py-3 font-medium">الإجراء</th>
                <th className="px-4 py-3 font-medium">الحساب المتأثر</th>
                <th className="px-4 py-3 font-medium">تفاصيل</th>
                <th className="px-4 py-3 font-medium">المنفّذ</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id} className="border-b border-ink-100 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-ink-800">{ACTION_LABELS[l.action] ?? l.action}</td>
                  <td className="break-all px-4 py-3 text-ink-600">{l.targetLabel || "—"}</td>
                  <td className="px-4 py-3 text-ink-500">{l.details || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">
                    <span className="break-all">{l.adminEmail}</span>
                    {l.ip && <span className="block" dir="ltr">{l.ip}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm text-ink-500">
          <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" /> السابق
          </button>
          <span>{page} / {totalPages}</span>
          <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            التالي <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
