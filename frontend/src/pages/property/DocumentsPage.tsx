import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Upload, FileText, Trash2 } from "lucide-react";
import { documentsApi } from "../../api/client";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorText } from "../../components/ui/ErrorText";
import { formatDateShort } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import type { Document, DocumentCategory } from "../../types";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  OWNERSHIP: "ملكية",
  CONTRACT: "عقود",
  INVOICE: "فواتير",
  RECEIPT: "إيصالات",
  BANK_STATEMENT: "كشوف حساب",
  DECISION: "قرارات",
  OTHER: "أخرى",
};

export default function DocumentsPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("OTHER");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (propertyId) documentsApi.list(propertyId).then(setDocuments);
  }
  useEffect(load, [propertyId]);

  async function handleUpload(file: File) {
    if (!propertyId) return;
    setError(null);
    setUploading(true);
    try {
      await documentsApi.upload(propertyId, file, category);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!propertyId) return;
    setError(null);
    try {
      await documentsApi.remove(propertyId, id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
          {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((c) => (
            <option key={c} value={c}>
              {t(CATEGORY_LABELS[c])}
            </option>
          ))}
        </select>
        <label className="btn-brass cursor-pointer text-sm">
          <Upload className="h-4 w-4" />
          {uploading ? t("جارٍ الرفع...") : t("رفع مستند")}
          <input type="file" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>
      </div>

      <ErrorText message={error} />

      {documents?.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title={t("لا توجد مستندات بعد")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {documents?.map((d) => (
            <div key={d.id} className="card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-parchment-200 text-ink-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-ink-800 hover:text-brass-600">
                  {d.fileName}
                </a>
                <p className="text-xs text-ink-400">
                  {t(CATEGORY_LABELS[d.category])} — {d.uploadedBy.fullName} — {formatDateShort(d.createdAt)}
                </p>
              </div>
              <button onClick={() => handleDelete(d.id)} className="btn-ghost h-8 w-8 shrink-0 p-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
