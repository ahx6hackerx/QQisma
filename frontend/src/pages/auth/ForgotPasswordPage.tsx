import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { Spinner } from "../../components/ui/Spinner";

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setSent(true); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-bold text-ink-800">قِسمة</p>
        </div>
        <div className="card space-y-4 p-6">
          <h1 className="font-display text-lg font-semibold text-ink-800">
            {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot your password?"}
          </h1>
          {sent ? (
            <p className="text-sm text-ink-600">
              {language === "ar"
                ? "إذا كان البريد الإلكتروني مسجّلاً، سيصلك رابط لإعادة التعيين خلال دقائق. تحقق من صندوق الوارد وصندوق البريد غير المرغوب."
                : "If this email is registered, a reset link will be sent shortly. Check your inbox and spam folder."}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-ink-500">
                {language === "ar"
                  ? "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة مرور جديدة."
                  : "Enter your email and we'll send you a link to set a new password."}
              </p>
              <div>
                <label className="label">{language === "ar" ? "البريد الإلكتروني" : "Email"}</label>
                <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn-brass w-full" disabled={loading}>
                {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
                {language === "ar" ? "إرسال رابط الاستعادة" : "Send reset link"}
              </button>
            </form>
          )}
          <p className="text-center text-sm">
            <Link to="/login" className="font-medium text-brass-600 hover:underline">
              {language === "ar" ? "← العودة لتسجيل الدخول" : "← Back to login"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
