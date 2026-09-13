# نشر قِسمة على Railway

هذا الدليل يشرح نشر الـ backend، الـ frontend، وقاعدة بيانات PostgreSQL كثلاث خدمات منفصلة داخل مشروع Railway واحد.

## نظرة عامة على البنية على Railway

```
Railway Project: qisma
├── Postgres            (قاعدة بيانات مُدارة)
├── qisma-backend        (Root Directory: backend)
└── qisma-frontend       (Root Directory: frontend)
```

---

## الطريقة الموصى بها: عبر GitHub

### 1) ارفع المشروع إلى GitHub
```bash
cd qisma
git init
git add .
git commit -m "Qisma initial commit"
# أنشئ مستودعًا فارغًا على GitHub أولاً، ثم:
git remote add origin https://github.com/<username>/qisma.git
git branch -M main
git push -u origin main
```

### 2) أنشئ مشروع Railway وأضف قاعدة البيانات
- على [railway.app](https://railway.app) → **New Project** → **Deploy PostgreSQL** (أو أضفها لاحقًا عبر **+ New → Database → PostgreSQL**).

### 3) أضف خدمة الـ Backend
- **+ New → GitHub Repo** → اختر مستودع qisma.
- بعد إنشاء الخدمة، افتح **Settings**:
  - **Root Directory**: `backend`
  - **Build Command**: (يُقرأ تلقائيًا من `backend/railway.json`)
  - **Start Command**: (يُقرأ تلقائيًا من `backend/railway.json`)
- في تبويب **Variables** أضف:
  - `DATABASE_URL` → اضغط **Add Reference** واختر خدمة Postgres → `DATABASE_URL`
  - `JWT_SECRET` → نص عشوائي طويل (32+ حرف)
  - `JWT_EXPIRES_IN` → `7d`
  - `CORS_ORIGIN` → اتركه مؤقتًا `http://localhost:5173` (سنعدله في الخطوة 5)
  - `UPLOAD_DIR` → `uploads`
- من تبويب **Settings → Networking**، اضغط **Generate Domain** لإعطاء الخدمة رابطًا عامًا. احفظ هذا الرابط (مثال: `qisma-backend-production.up.railway.app`).

### 4) تحقق من صحة الـ Backend
افتح `https://<backend-domain>/api/health` في المتصفح — يجب أن ترى `{"ok":true,...}`.

### 5) أضف خدمة الـ Frontend
- **+ New → GitHub Repo** → نفس المستودع مرة أخرى (Railway يسمح بأكثر من خدمة لنفس المستودع).
- **Settings → Root Directory**: `frontend`
- **Variables**:
  - `VITE_API_URL` → `https://<backend-domain>/api` (بالضبط كما نسخته في الخطوة 3 — **يجب ضبط هذا قبل أول Build** لأن Vite يُضمّنه داخل الملفات النهائية وقت البناء وليس وقت التشغيل).
- **Settings → Networking → Generate Domain** لهذه الخدمة أيضًا.

### 6) اربط الـ CORS
ارجع لخدمة **qisma-backend → Variables** وعدّل:
- `CORS_ORIGIN` → `https://<frontend-domain>` (رابط الخدمة الأمامية الذي حصلت عليه بالخطوة 5)

حفظ التعديل يعيد نشر الخدمة تلقائيًا.

### 7) طبّق الهجرات وابذر بيانات تجريبية (اختياري)
هجرات قاعدة البيانات (`prisma migrate deploy`) تُنفَّذ تلقائيًا مع كل نشر (جزء من أمر `start`). لبذر بيانات تجريبية على الإنتاج:
```bash
npm i -g @railway/cli
railway login
railway link          # اختر مشروع qisma ثم خدمة qisma-backend
railway run npm run seed
```

### 8) افتح التطبيق
زر `https://<frontend-domain>` وسجّل الدخول بأحد الحسابات التجريبية (إن نفّذت خطوة البذر) أو أنشئ حسابًا من `/register`.

---

## بديل سريع بدون GitHub: عبر Railway CLI مباشرة

```bash
npm i -g @railway/cli
railway login
railway init                      # ينشئ مشروع Railway جديد

cd backend
railway up                        # ينشر مجلد backend كخدمة
railway variables --set "JWT_SECRET=$(openssl rand -hex 32)" --set "JWT_EXPIRES_IN=7d" --set "UPLOAD_DIR=uploads"
# أضف قاعدة PostgreSQL من لوحة railway.app لنفس المشروع، ثم اربط DATABASE_URL من الواجهة كما في الخطوة 3 أعلاه.
railway domain                    # يولّد رابطًا عامًا للـ backend

cd ../frontend
railway variables --set "VITE_API_URL=https://<backend-domain>/api"
railway up
railway domain
```

---

## ملاحظات مهمة

- **الملفات المرفوعة (uploads)**: نظام الملفات على Railway غير دائم افتراضيًا بين عمليات إعادة النشر. لحفظ الإثباتات/المستندات المرفوعة، أضف **Volume** لخدمة qisma-backend من **Settings → Volumes** واربطه بالمسار `/app/uploads`. بديل أفضل للإنتاج الحقيقي: استبدال `backend/src/utils/upload.ts` بتخزين على S3 أو ما يعادله.
- **PORT**: Railway يضبط متغير `PORT` تلقائيًا لكل خدمة — لا تضبطه يدويًا، الكود يقرأه تلقائيًا (`process.env.PORT`).
- **تحديثات لاحقة**: أي `git push` على الفرع الرئيسي (مع طريقة GitHub) يعيد نشر الخدمتين تلقائيًا.
- **الهجرات المستقبلية**: عند تعديل `schema.prisma` محليًا، شغّل `npx prisma migrate dev --name <وصف>` لإنشاء ملف هجرة جديد وادفعه ضمن الكود — سيُطبَّق تلقائيًا على الإنتاج عبر `prisma migrate deploy` في أمر التشغيل.
