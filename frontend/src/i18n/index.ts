// ---------------------------------------------------------------------------
// Lightweight i18n for Qisma.
//
// Pattern: every UI string is authored in Arabic (the app's native
// language) directly in JSX, wrapped as t("النص العربي"). When the app is
// in English mode, t() looks the Arabic source string up in DICTIONARY and
// returns the English translation; in Arabic mode (or for any string that
// hasn't been added to the dictionary yet) it returns the original Arabic
// unchanged. This means a missing translation degrades gracefully instead
// of crashing or showing a raw key.
//
// `currentLang` is a plain module-level variable (not React state) so that
// non-component helper functions — like the date/number formatters in
// lib/format.ts — can read the active language without needing to thread
// it through every function call. LanguageContext (context/LanguageContext
// .tsx) is the thin React wrapper that keeps this in sync with actual
// component re-renders.
// ---------------------------------------------------------------------------

export type Lang = "ar" | "en";

export let currentLang: Lang = "ar";

export function setCurrentLang(lang: Lang) {
  currentLang = lang;
}

const DICTIONARY: Record<string, string> = {
  // ---- Brand / shell -------------------------------------------------
  "قِسمة": "Qisma",  "QISMA — سجل العقار المشترك": "QISMA — Shared Property Ledger",
  "سجل مشترك وشفاف لعقارك": "A shared, transparent ledger for your property",
  "لوحة التحكم": "Dashboard",
  "العقارات": "Properties",
  "الإشعارات": "Notifications",
  "تسجيل الخروج": "Log out",
  "توسيع القائمة": "Expand sidebar",
  "طي القائمة": "Collapse sidebar",
  "الوضع الداكن": "Dark mode",
  "الوضع الفاتح": "Light mode",
  "English": "English",
  "العربية": "العربية",

  // ---- Property workspace tabs ----------------------------------------
  "نظرة عامة": "Overview",
  "الملكية والشركاء": "Ownership & Partners",
  "المالية": "Finance",
  "الإثباتات": "Evidence",
  "الاعتراضات": "Disputes",
  "الإقفال والتوزيع": "Closing & Distribution",
  "القرارات": "Decisions",
  "المستندات": "Documents",
  "التقارير": "Reports",
  "النشاط": "Activity",
  "القيمة التقديرية": "Estimated value",

  // ---- Status labels (lib/status.ts) ----------------------------------
  "مُدخل": "Reported",
  "إثبات مرفق": "Evidence submitted",
  "قيد المراجعة": "Under review",
  "موثّق": "Verified",
  "محل اعتراض": "Disputed",
  "مفتوح": "Open",
  "تم الحل": "Resolved",
  "بانتظار الرفع": "Pending upload",
  "تم الرفع": "Uploaded",
  "تمت المراجعة": "Reviewed",
  "مكتمل": "Completed",
  "بانتظار الرد": "Awaiting response",
  "مؤكَّد": "Confirmed",
  "مبلغ مختلف": "Amount different",
  "مُقفل": "Closed",
  "قيد الإعداد": "Preparing",
  "معتمد": "Approved",
  "مدفوع": "Paid",
  "قيد التصويت": "Voting",
  "تمت الموافقة": "Approved",
  "مرفوض": "Rejected",
  "تم التنفيذ": "Executed",
  "مالك/شريك": "Owner/Partner",
  "مدير العقار": "Property Manager",
  "محاسب": "Accountant",
  "مشاهدة فقط": "Viewer",
  "لا يحتاج موافقة": "No approval needed",
  "موافقة المدير فقط": "Manager approval only",
  "أغلبية بسيطة": "Simple majority",
  "ثلثا الملكية": "Two-thirds ownership",
  "إجماع الشركاء": "Unanimous partners",

  // ---- Months -----------------------------------------------------------
  "يناير": "January", "فبراير": "February", "مارس": "March", "أبريل": "April",
  "مايو": "May", "يونيو": "June", "يوليو": "July", "أغسطس": "August",
  "سبتمبر": "September", "أكتوبر": "October", "نوفمبر": "November", "ديسمبر": "December",

  // ---- Dashboard ----------------------------------------------------
  "أهلًا": "Welcome,",
  "هذه صورة سريعة عن عقاراتك المشتركة.": "Here's a quick snapshot of your shared properties.",
  "عقار جديد": "New property",
  "قيمة حصتي من المحفظة": "My portfolio share value",
  "عدد العقارات": "Number of properties",
  "اعتراضات مفتوحة": "Open disputes",
  "قرارات بانتظار التصويت": "Decisions awaiting vote",
  "عقاراتي": "My properties",
  "لا توجد عقارات بعد": "No properties yet",
  "أنشئ أول عقار وابدأ بتوثيق الملكية والحسابات المشتركة.": "Create your first property and start documenting shared ownership and accounts.",
  "إنشاء عقار": "Create property",
  "نسبة ملكيتي": "My ownership share",
  "قيمة حصتي": "My share value",
  "دوري": "My role",

  // ---- Login / Register -------------------------------------------------
  "تسجيل الدخول": "Log in",
  "البريد الإلكتروني": "Email",
  "كلمة المرور": "Password",
  "دخول": "Sign in",
  "ليس لديك حساب؟": "Don't have an account?",
  "إنشاء حساب": "Create account",
  "بيانات تجريبية: mohammad@qisma.test / ahmad@qisma.test / khaled@qisma.test / sara@qisma.test — كلمة المرور للجميع: password123":
    "Demo accounts: mohammad@qisma.test / ahmad@qisma.test / khaled@qisma.test / sara@qisma.test — password for all: password123",
  "إنشاء حساب جديد": "Create a new account",
  "الاسم الكامل": "Full name",
  "رقم الهاتف (اختياري)": "Phone number (optional)",
  "إنشاء الحساب": "Create account",
  "لديك حساب بالفعل؟": "Already have an account?",

  // ---- Notifications / public confirm ------------------------------------
  "تعليم الكل كمقروء": "Mark all as read",
  "لا توجد إشعارات": "No notifications",
  "تأكيد عملية مالية": "Confirm a transaction",
  "المبلغ صحيح": "Amount is correct",
  "المبلغ مختلف": "Amount is different",
  "المبلغ الصحيح حسب معلوماتك (JD)": "The correct amount per your records (JD)",
  "إرسال": "Send",
  "رجوع": "Back",
  "شكرًا لك، تم إرسال ردك بنجاح.": "Thank you, your response has been sent successfully.",
  "يمكنك إغلاق هذه الصفحة الآن.": "You can close this page now.",
  "رابط التأكيد غير صالح.": "This confirmation link is invalid.",

  // ---- Properties list / create -----------------------------------------
  "أنشئ أول عقار مشترك وحدد نسب الملكية بين الشركاء.": "Create your first shared property and set ownership shares between partners.",
  "العقار": "Property",
  "الشركاء": "Partners",
  "قبل أن نبدأ": "Before we start",
  "أنشئ مجموعة (عائلة أو مجموعة مستثمرين) لتنظيم عقاراتك المشتركة تحتها.": "Create a group (family or investor group) to organize your shared properties under.",
  "اسم المجموعة": "Group name",
  "متابعة": "Continue",
  "إنشاء عقار جديد": "Create a new property",
  "بيانات العقار": "Property details",
  "المجموعة": "Group",
  "اختر مجموعة": "Choose a group",
  "اسم العقار": "Property name",
  "العنوان (اختياري)": "Address (optional)",
  "القيمة التقديرية JD (اختياري)": "Estimated value JD (optional)",
  "الشركاء ونسب الملكية": "Partners & ownership shares",
  "المجموع:": "Total:",
  "الاسم (إن كان شريكًا جديدًا)": "Name (if a new partner)",
  "النسبة %": "Share %",
  "إضافة شريك": "Add partner",
  "اسم الشريك": "Partner name",
  "مثال: عائلة الشريف": "e.g. the Al-Sharif family",
  "مثال: عمارة النور": "e.g. Al-Noor Building",
  "إنشاء العقار": "Create property",

  // ---- Overview -----------------------------------------------------
  "عمليات غير موثقة": "Unverified transactions",
  "قرارات قيد التصويت": "Decisions in voting",
  "عدد الشركاء": "Number of partners",
  "هيكل الملكية": "Ownership structure",
  "أين ذهبت الأموال؟": "Where did the money go?",
  "الدخل": "Income",
  "المصاريف": "Expenses",
  "الصافي": "Net",
  "آخر النشاطات": "Recent activity",
  "لا يوجد نشاط بعد.": "No activity yet.",

  // ---- Ownership page -----------------------------------------------
  "الملكية الحالية": "Current ownership",
  "السجل التاريخي": "History",
  "الشركاء والصلاحيات": "Partners & permissions",
  "تحديث الملكية": "Update ownership",
  "الشريك": "Partner",
  "النسبة": "Share",
  "ساري منذ": "Effective since",
  "ساري": "Current",
  "الصلاحية": "Permission",
  "الاسم الكامل (إن كان شريكًا جديدًا)": "Full name (if a new partner)",
  "إضافة": "Add",
  "تحديث نسب الملكية": "Update ownership shares",
  "سيتم إغلاق السجل الحالي للملكية وحفظ النسب الجديدة اعتبارًا من اليوم — التاريخ القديم يبقى محفوظًا في السجل التاريخي.":
    "The current ownership record will be closed and the new shares saved as of today — the old history stays preserved in the record.",
  "سبب التحديث (اختياري)": "Reason for update (optional)",
  "مثال: تسوية إرث، بيع حصة...": "e.g. inheritance settlement, share sale...",
  "حفظ التحديث": "Save update",

  // ---- Finance page -----------------------------------------------------
  "الكل": "All",
  "إيرادات": "Income",
  "مصاريف": "Expenses",
  "تسجيل عملية": "Record transaction",
  "استيراد كشف حساب": "Import bank statement",
  "إيرادات مُدخلة": "Reported income",
  "إيرادات موثقة": "Verified income",
  "مصاريف مُدخلة": "Reported expenses",
  "مصاريف موثقة": "Verified expenses",
  "لا توجد عمليات لهذا الشهر": "No transactions this month",
  "التاريخ": "Date",
  "التصنيف": "Category",
  "المبلغ": "Amount",
  "الحالة": "Status",
  "تسجيل عملية مالية": "Record a transaction",
  "إيراد": "Income",
  "مصروف": "Expense",
  "المبلغ (JD)": "Amount (JD)",
  "وصف (اختياري)": "Description (optional)",
  "حفظ": "Save",
  "إيجار": "Rent", "خدمات مشتركة": "Shared services", "أخرى": "Other",
  "صيانة": "Maintenance", "كهرباء": "Electricity", "مياه": "Water",
  "تنظيف": "Cleaning", "إدارة": "Management", "إصلاحات": "Repairs",
  "لا يوجد إثبات مرفق بعد.": "No evidence attached yet.",
  "رفع إثبات": "Upload evidence",
  "جارٍ الرفع...": "Uploading...",
  "تأكيد الطرف الآخر": "Third-party confirmation",
  "طلب تأكيد من طرف مستقل (مثل المستأجر)": "Request confirmation from an independent party (e.g. tenant)",
  "تم إنشاء رابط التأكيد:": "Confirmation link created:",
  "اسم الطرف الآخر": "Other party's name",
  "إرسال طلب": "Send request",
  "إرسال الطلب": "Send request",
  "توثيق العملية": "Verify transaction",
  "فتح اعتراض": "Open dispute",
  "سبب الاعتراض": "Reason for dispute",

  // ---- Evidence page ------------------------------------------------
  "طلبات الإثبات": "Evidence requests",
  "الفروقات": "Discrepancies",
  "طلب إثبات": "Request evidence",
  "لا توجد طلبات إثبات": "No evidence requests",
  "رفع": "Upload",
  "إغلاق الطلب": "Close request",
  "لا توجد فروقات مسجّلة": "No discrepancies recorded",
  "ستظهر هنا العمليات التي طلبت تأكيدًا من طرف مستقل.": "Transactions that requested independent confirmation will appear here.",
  "العملية": "Transaction",
  "المبلغ المسجل": "Reported amount",
  "التأكيد": "Confirmation",
  "الفرق": "Difference",
  "النتيجة": "Result",
  "متطابق": "Matched",
  "فرق": "Discrepancy",
  "بانتظار": "Pending",
  "وصف الطلب": "Request description",
  "مثال: أرفق كشف حساب شهر سبتمبر": "e.g. attach the September bank statement",
  "توجيه الطلب إلى (اختياري)": "Assign request to (optional)",
  "كل الشركاء": "All partners",

  // ---- Disputes page ------------------------------------------------
  "لا توجد اعتراضات": "No disputes",
  "أضف تعليقًا...": "Add a comment...",
  "حل الاعتراض": "Resolve dispute",
  "كيف تم حل الاعتراض؟": "How was the dispute resolved?",
  "تصحيح المبلغ (اختياري)": "Corrected amount (optional)",
  "تأكيد الحل": "Confirm resolution",
  "تم الحل:": "Resolved:",

  // ---- Closing & distributions ---------------------------------------
  "الإقفال الشهري": "Monthly closing",
  "التوزيعات": "Distributions",
  "حصتي": "My share",
  "إقفال الشهر": "Close month",
  "إيراد مُدخل": "Reported income",
  "إيراد موثّق": "Verified income",
  "مصروف مُدخل": "Reported expenses",
  "مصروف موثّق": "Verified expenses",
  "صافي الدخل الموثّق": "Verified net income",
  "سجل الإقفالات السابقة": "Past closings",
  "لا توجد إقفالات سابقة": "No past closings",
  "الشهر": "Month",
  "التوزيع": "Distribution",
  "إنشاء توزيع": "Create distribution",
  "لا توجد توزيعات بعد": "No distributions yet",
  "تسجيل الدفع": "Mark as paid",
  "بانتظار الدفع": "Awaiting payment",
  "قيمة حصتي من العقار": "My share value in the property",
  "المستلم": "Received",
  "المتبقي": "Remaining",
  "توزيعاتي": "My distributions",
  "لا توجد توزيعات بعد.": "No distributions yet.",
  "مستلم": "Received",
  "قيد الانتظار": "Pending",
  "هل تريد إقفال الشهر رغم ذلك؟": "Do you want to close the month anyway?",

  // ---- Decisions page -----------------------------------------------
  "قرار جديد": "New decision",
  "لا توجد قرارات بعد": "No decisions yet",
  "نسبة الموافقة": "Approval rate",
  "موافق": "Approve",
  "رفض": "Reject",
  "موافقة": "Approve",
  "تسجيل التنفيذ": "Mark as executed",
  "عنوان القرار": "Decision title",
  "مثال: استبدال المصعد": "e.g. Replace the elevator",
  "التفاصيل (اختياري)": "Details (optional)",
  "المبلغ المرتبط JD (اختياري — يحدد قاعدة الموافقة المطلوبة)": "Associated amount JD (optional — determines the required approval rule)",
  "إنشاء القرار": "Create decision",

  // ---- Documents page -----------------------------------------------
  "ملكية": "Ownership", "عقود": "Contracts", "فواتير": "Invoices",
  "إيصالات": "Receipts", "كشوف حساب": "Bank statements", "قرارات": "Decisions",
  "رفع مستند": "Upload document",
  "لا توجد مستندات بعد": "No documents yet",

  // ---- Reports page -------------------------------------------------
  "التقرير الشهري": "Monthly report",
  "عدد العمليات": "Number of transactions",
  "اعتراضات": "Disputes",
  "لم يُقفل بعد": "Not closed yet",
  "النوع": "Type",
  "الإجمالي": "Total",
  "الموثّق": "Verified",
  "لا توجد عمليات لهذا الشهر.": "No transactions this month.",
  "تقرير الشريك": "Partner report",
  "نسبة الملكية": "Ownership share",
  "إجمالي المستلم": "Total received",
  "إجمالي المتبقي": "Total remaining",

  // ---- Activity / audit -----------------------------------------------
  "سجل النشاط": "Activity log",
  "سجل التدقيق (Audit Log)": "Audit log",
  "لا يوجد نشاط بعد": "No activity yet",
  "لا توجد سجلات تدقيق بعد": "No audit records yet",
  "هذا السجل يوثّق كل تعديل حساس (مبالغ، ملكية، إغلاق) بشكل ثابت لا يمكن تعديله.":
    "This log records every sensitive change (amounts, ownership, closing) permanently — it cannot be edited.",
  "قبل": "Before",
  "بعد": "After",
  "السبب:": "Reason:",
};

export function t(arabicText: string): string {
  if (currentLang === "en") return DICTIONARY[arabicText] ?? arabicText;
  return arabicText;
}
