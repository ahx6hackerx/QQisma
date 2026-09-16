import { FormEvent, useState } from "react";
import { Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { authApi } from "../api/client";
import { ErrorText } from "../components/ui/ErrorText";
import { Spinner } from "../components/ui/Spinner";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { t, language } = useLanguage();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleFileChange(file: File) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const updated = await authApi.updateMe({ fullName, phone, avatar: avatarFile ?? undefined });
      setUser(updated);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-800">
        {language === "ar" ? "الملف الشخصي" : "Profile"}
      </h1>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <ErrorText message={error} />
        {success && (
          <p className="rounded-md bg-sage-50 px-3 py-2 text-sm text-sage-600">
            {language === "ar" ? "تم حفظ التعديلات بنجاح." : "Changes saved successfully."}
          </p>
        )}

        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brass-500 font-display text-2xl font-bold text-ink-900">
                {fullName.charAt(0)}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-ink-800 text-parchment-50 hover:bg-ink-700">
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-700">{language === "ar" ? "الصورة الشخصية" : "Profile photo"}</p>
            <p className="text-xs text-ink-400">{language === "ar" ? "اضغط على الأيقونة لتغييرها" : "Click the icon to change it"}</p>
          </div>
        </div>

        <div>
          <label className="label">{t("الاسم الكامل")}</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("رقم الهاتف (اختياري)")}</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("البريد الإلكتروني")}</label>
          <input className="input bg-parchment-100" value={user?.email ?? ""} disabled />
        </div>
        <div>
          <label className="label">{language === "ar" ? "نوع الحساب" : "Account type"}</label>
          <input
            className="input bg-parchment-100"
            disabled
            value={user?.accountType === "BROKER" ? (language === "ar" ? "وسيط عقاري" : "Real estate broker") : language === "ar" ? "مالك عقاري" : "Property owner"}
          />
        </div>

        <button className="btn-brass w-full" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
          {t("حفظ")}
        </button>
      </form>
    </div>
  );
}
