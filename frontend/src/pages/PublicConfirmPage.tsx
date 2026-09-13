import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { publicApi } from "../api/client";
import { PageSpinner } from "../components/ui/Spinner";
import { ErrorText } from "../components/ui/ErrorText";
import { formatDate, formatMoney } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";

export default function PublicConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [data, setData] = useState<{
    property: string;
    category: string;
    date: string;
    reportedAmount: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showDifferentForm, setShowDifferentForm] = useState(false);
  const [actualAmount, setActualAmount] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    publicApi
      .getConfirmation(id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function respond(confirmed: boolean) {
    if (!id) return;
    setError(null);
    try {
      await publicApi.respondConfirmation(id, {
        confirmed,
        actualAmount: confirmed ? undefined : Number(actualAmount),
      });
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-bold text-ink-800">{t("قِسمة")}</p>
          <p className="mt-1 text-sm text-ink-400">{t("تأكيد عملية مالية")}</p>
        </div>

        <div className="card p-6">
          <ErrorText message={error} />

          {!data && !error && <p className="text-sm text-ink-500">{t("رابط التأكيد غير صالح.")}</p>}

          {data && !submitted && (
            <>
              <p className="text-sm text-ink-500">
                {language === "ar" ? (
                  <>
                    يطلب منك <span className="font-semibold text-ink-700">{data.property}</span> تأكيد العملية التالية:
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-ink-700">{data.property}</span> is asking you to confirm the following transaction:
                  </>
                )}
              </p>
              <div className="my-4 rounded-md bg-parchment-100 p-4">
                <p className="text-sm text-ink-500">{data.category}</p>
                <p className="num mt-1 text-2xl font-bold text-ink-800">{formatMoney(data.reportedAmount)}</p>
                <p className="mt-1 text-xs text-ink-400">{formatDate(data.date)}</p>
              </div>

              {!showDifferentForm ? (
                <div className="flex gap-2">
                  <button onClick={() => respond(true)} className="btn-brass flex-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("المبلغ صحيح")}
                  </button>
                  <button onClick={() => setShowDifferentForm(true)} className="btn-outline flex-1">
                    <XCircle className="h-4 w-4" />
                    {t("المبلغ مختلف")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="label">{t("المبلغ الصحيح حسب معلوماتك (JD)")}</label>
                    <input
                      className="input"
                      type="number"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respond(false)} className="btn-primary flex-1" disabled={!actualAmount}>
                      {t("إرسال")}
                    </button>
                    <button onClick={() => setShowDifferentForm(false)} className="btn-ghost">
                      {t("رجوع")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {submitted && (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-sage-500" />
              <p className="font-medium text-ink-700">{t("شكرًا لك، تم إرسال ردك بنجاح.")}</p>
              <p className="mt-1 text-sm text-ink-400">{t("يمكنك إغلاق هذه الصفحة الآن.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
