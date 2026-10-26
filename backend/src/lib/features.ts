// Catalog of features the admin can switch off (per user or platform-wide).
// Each feature is matched against the request method + URL path, so the
// gate lives in one place (requireAuth) instead of in every router.

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
  match: (method: string, path: string) => boolean;
}

const P = "/api/properties";
const prop = (re: RegExp) => (_m: string, path: string) => path.startsWith(P) && re.test(path);

export const FEATURES: FeatureDef[] = [
  {
    key: "create_property",
    label: "إنشاء عقارات جديدة",
    description: "إضافة عقار جديد إلى المنصة.",
    match: (m, p) => m === "POST" && /^\/api\/properties\/?$/.test(p),
  },
  {
    key: "invite_partners",
    label: "دعوة الشركاء",
    description: "إضافة شركاء أو أعضاء جدد إلى عقار.",
    match: (m, p) => m === "POST" && /^\/api\/properties\/[^/]+\/partners/.test(p),
  },
  {
    key: "finance_write",
    label: "تسجيل المعاملات المالية",
    description: "إضافة أو تعديل الدخل والمصروفات.",
    match: (m, p) => m !== "GET" && /^\/api\/properties\/[^/]+\/transactions\/?(\/[^/]+)?\/?$/.test(p),
  },
  {
    key: "ocr",
    label: "مسح الإيصالات (OCR)",
    description: "قراءة الإيصالات تلقائيًا من الصور.",
    match: prop(/\/ocr-receipt/),
  },
  {
    key: "bank_import",
    label: "استيراد كشف البنك",
    description: "رفع كشف حساب بنكي واستيراد حركاته.",
    match: prop(/\/bank-import/),
  },
  {
    key: "evidence",
    label: "الإثباتات والتوثيق",
    description: "رفع الإثباتات وطلبها وتأكيد الأطراف الخارجية.",
    match: prop(/\/(evidence|evidence-requests|confirmation-request|discrepancies)(\/|$)/),
  },
  {
    key: "documents",
    label: "المستندات",
    description: "رفع المستندات وإدارتها.",
    match: prop(/\/documents/),
  },
  {
    key: "disputes",
    label: "الاعتراضات",
    description: "فتح الاعتراضات والتعليق عليها.",
    match: prop(/\/disputes/),
  },
  {
    key: "closing",
    label: "الإقفال الشهري والتوزيع",
    description: "إقفال الأشهر وتوزيع الأرباح على الشركاء.",
    match: prop(/\/(closings|distributions|my-share)(\/|$)/),
  },
  {
    key: "decisions",
    label: "القرارات والتصويت",
    description: "إنشاء القرارات والتصويت عليها.",
    match: prop(/\/decisions/),
  },
  {
    key: "reports",
    label: "التقارير وملفات PDF",
    description: "التقارير الشهرية وتقارير الشركاء وتصدير PDF.",
    match: prop(/\/(reports|anomalies)(\/|$)/),
  },
  {
    key: "tenants_maintenance",
    label: "المستأجرون والصيانة",
    description: "إدارة المستأجرين وطلبات الصيانة والمقاولين.",
    match: prop(/\/(tenants|maintenance|vendors)(\/|$)/),
  },
  {
    key: "broker",
    label: "مساحة الوسيط العقاري",
    description: "الإعلانات العقارية والعملاء المحتملون.",
    match: (_m, p) => p.startsWith("/api/broker"),
  },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

export function featureForRequest(method: string, path: string): FeatureDef | undefined {
  return FEATURES.find((f) => f.match(method, path));
}

export function featureLabel(key: string) {
  return FEATURES.find((f) => f.key === key)?.label ?? key;
}
