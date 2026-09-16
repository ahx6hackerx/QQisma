import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorText } from "../../components/ui/ErrorText";
import { Spinner } from "../../components/ui/Spinner";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("mohammad@qisma.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.accountType === "BROKER" ? "/broker" : "/app");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-bold text-ink-800">{t("قِسمة")}</p>
          <p className="mt-1 text-sm text-ink-400">{t("سجل مشترك وشفاف لعقارك")}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h1 className="font-display text-lg font-semibold text-ink-800">{t("تسجيل الدخول")}</h1>
          <ErrorText message={error} />
          <div>
            <label className="label">{t("البريد الإلكتروني")}</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("كلمة المرور")}</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-brass w-full" disabled={loading}>
            {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {t("دخول")}
          </button>
          <p className="text-center text-sm text-ink-400">
            {t("ليس لديك حساب؟")}{" "}
            <Link to="/register" className="font-medium text-brass-600 hover:underline">
              {t("إنشاء حساب")}
            </Link>
          </p>
          <p className="rounded-md bg-parchment-200 px-3 py-2 text-xs text-ink-500">
            {t(
              "بيانات تجريبية: mohammad@qisma.test / ahmad@qisma.test / khaled@qisma.test / sara@qisma.test — كلمة المرور للجميع: password123"
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
