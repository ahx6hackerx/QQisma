import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorText } from "../../components/ui/ErrorText";
import { Spinner } from "../../components/ui/Spinner";
import type { AccountType } from "../../types";

export default function RegisterPage() {
  const { register } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>("OWNER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(fullName, email, password, accountType, phone || undefined);
      navigate(accountType === "BROKER" ? "/broker" : "/app");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-bold text-ink-800">{t("قِسمة")}</p>
          <p className="mt-1 text-sm text-ink-400">{t("سجل مشترك وشفاف لعقارك")}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h1 className="font-display text-lg font-semibold text-ink-800">{t("إنشاء حساب جديد")}</h1>
          <ErrorText message={error} />

          <div>
            <label className="label">{language === "ar" ? "أنا..." : "I am a..."}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("OWNER")}
                className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors ${
                  accountType === "OWNER" ? "border-brass-400 bg-brass-50 text-brass-700" : "border-ink-200 text-ink-500"
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">{language === "ar" ? "مالك عقاري" : "Property owner"}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("BROKER")}
                className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors ${
                  accountType === "BROKER" ? "border-brass-400 bg-brass-50 text-brass-700" : "border-ink-200 text-ink-500"
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span className="text-xs font-medium">{language === "ar" ? "وسيط عقاري" : "Real estate broker"}</span>
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-400">
              {accountType === "OWNER"
                ? language === "ar"
                  ? "لإدارة ملكية عقار مشترك بينك وبين شركاء/ورثة."
                  : "To manage a property you co-own with partners/heirs."
                : language === "ar"
                ? "لتنظيم العقارات التي تسوّقها مع عملائك المحتملين."
                : "To organize the properties you're marketing with potential buyers."}
            </p>
          </div>

          <div>
            <label className="label">{t("الاسم الكامل")}</label>
            <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("البريد الإلكتروني")}</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("رقم الهاتف (اختياري)")}</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("كلمة المرور")}</label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-brass w-full" disabled={loading}>
            {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {t("إنشاء الحساب")}
          </button>
          <p className="text-center text-sm text-ink-400">
            {t("لديك حساب بالفعل؟")}{" "}
            <Link to="/login" className="font-medium text-brass-600 hover:underline">
              {t("تسجيل الدخول")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
