import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorText } from "../../components/ui/ErrorText";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { setUser } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError(language === "ar" ? "رابط غير صالح. اطلب رابطًا جديدًا." : "Invalid link. Request a new one.");
  }, [token, language]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError(language === "ar" ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."); return; }
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.resetPassword(token, password);
      localStorage.setItem("qisma_token", data.token);
      setUser(data.user);
      navigate(data.user.accountType === "BROKER" ? "/broker" : "/app", { replace: true });
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
          <p className="font-display text-3xl font-bold text-ink-800">قِسمة</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h1 className="font-display text-lg font-semibold text-ink-800">
            {language === "ar" ? "تعيين كلمة مرور جديدة" : "Set new password"}
          </h1>
          <ErrorText message={error} />
          <div>
            <label className="label">{language === "ar" ? "كلمة المرور الجديدة" : "New password"}</label>
            <input className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">{language === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}</label>
            <input className="input" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn-brass w-full" disabled={loading || !token}>
            {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {language === "ar" ? "حفظ كلمة المرور" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
