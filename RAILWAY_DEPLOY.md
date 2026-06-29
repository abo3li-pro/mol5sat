# نشر Mol5sat على Railway — مجاني وبدون خادم
# Deploy Mol5sat on Railway — Free, No Server Required

---

## ليه Railway؟

| | Railway | DigitalOcean VPS |
|---|---|---|
| السعر | مجاني للبداية ($5 credit + $5/mo free tier) | $6/شهر |
| الإعداد | اضغط زرار | ساعات من الأوامر |
| الصيانة | صفر | تحديثات الـ OS، إعداد Nginx، SSL... |
| SSL تلقائي | ✅ | يدوي عبر certbot |
| Deploy من GitHub | ✅ تلقائي | يدوي |
| **المشكلة الوحيدة** | SQLite يحتاج volume مدفوع أو تحتاج PostgreSQL | SQLite يشتغل عادي |

**الحل**: Railway عنده **Volumes** مجانية على الخطة المدفوعة، أو نستخدم PostgreSQL المجاني اللي بيوفره Railway.

لكن الأسهل لـ Mol5sat: **نحتجز Volume على Railway ($0.25/GB/شهر ≈ أقل من دولار)** ونشغّل SQLite عليه بدون أي تغيير في الكود.

---

## الخطوة 1 — إنشاء حساب على Railway

1. افتح **railway.app**
2. اضغط **"Start a New Project"**
3. سجّل دخول بـ **GitHub** (الأسهل — Railway هيحتاج GitHub لاحقاً)
4. ادفع بطاقتك لتفعيل الـ Trial (مش هيتحسب منك إلا لو تجاوزت الـ free tier)

---

## الخطوة 2 — رفع الكود على GitHub

### أنشئ Repository:
1. افتح **github.com** وسجّل دخول
2. اضغط **"+"** → **"New repository"**
3. اسمه: `mol5sat`
4. اختار **Private**
5. اضغط **"Create repository"**

### ارفع الملفات:
**الطريقة السهلة — GitHub Desktop:**
1. نزّل **GitHub Desktop** من **desktop.github.com**
2. افتحه → سجّل دخول بحساب GitHub
3. اضغط **"File"** → **"Add Local Repository"**
4. اختار مجلد `mol5sat` من جهازك
5. اضغط **"Publish Repository"** → اختار `mol5sat` → اضغط **"Publish"**

✅ الكود الآن على GitHub — **لاحظ إن `.env` مش موجود في الـ repo** (محمي بالـ .gitignore، ده مقصود)

---

## الخطوة 3 — ربط Railway بـ GitHub

1. في Railway، اضغط **"New Project"**
2. اختار **"Deploy from GitHub repo"**
3. اضغط **"Configure GitHub App"** وامنح Railway صلاحية الوصول لـ repo بتاعك
4. اختار `mol5sat` من القائمة
5. Railway هيكتشف تلقائياً إن في `package.json` ويبدأ البناء

---

## الخطوة 4 — إضافة Volume للداتابيز

**ده الخطوة المهمة** — بدونها الداتابيز هتتمسح كل مرة تعمل deploy جديد.

1. في صفحة المشروع على Railway، اضغط على الـ service بتاعك
2. اضغط **"+"** → **"Add Volume"** (أو من القائمة الجانبية **"Volumes"**)
3. في إعدادات الـ Volume:
   - **Mount Path**: `/data`
   - **Size**: 1 GB (كافي لسنوات)
4. اضغط **"Create"**

Railway هيعطيك Volume يشتغل زي هارد ديسك ثابت. الملفات دي مش بتتمسح.

---

## الخطوة 5 — ضبط متغيرات البيئة (Environment Variables)

بدل الـ `.env` على السيرفر، Railway بيخليك تحط المتغيرات في الـ dashboard.

في صفحة الـ service اضغط **"Variables"** ثم أضف كل واحد:

| اسم المتغير | القيمة |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | انسخ من الأسفل |
| `JWT_EXPIRES_IN` | `30d` |
| `WALLET_ENCRYPTION_KEY` | انسخ من الأسفل |
| `DB_PATH` | `/data/mol5sat.db` |
| `DOMAIN` | `https://your-app.up.railway.app` (هتعرفه بعد أول deploy) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | إيميل Gmail بتاعك |
| `SMTP_PASS` | كلمة سر التطبيق من Gmail (اتبع الخطوات أسفل) |
| `SMTP_FROM` | `Mol5sat <إيميلك>` |
| `SITE_URL` | `https://your-app.up.railway.app` |

### توليد JWT_SECRET:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
لو مش عندك Node على جهازك، استخدم الموقع ده: **generate.plus/en/number/hex** — اطلب 128 character.

### توليد WALLET_ENCRYPTION_KEY (64 hex characters بالضبط):
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Gmail App Password (لإرسال إيميلات):
1. افتح حساب Gmail → **Manage your Google Account**
2. اضغط **"Security"**
3. فعّل **"2-Step Verification"** لو مش مفعّل
4. ابحث عن **"App passwords"** واضغطه
5. اختار **"Mail"** و**"Other"** → اكتب `Mol5sat`
6. اضغط **"Generate"** — هيطلعلك كلمة سر 16 حرف — دي الـ `SMTP_PASS`

---

## الخطوة 6 — إضافة دومين مجاني من Railway

Railway بيعطيك URL مجاناً زي `mol5sat.up.railway.app`.

1. في الـ service، اضغط **"Settings"**
2. اضغط **"Generate Domain"**
3. انسخ الـ URL واحطه في متغير `DOMAIN` و`SITE_URL`
4. اضغط **"Save"** — Railway هيعيد النشر تلقائياً

**للدومين المدفوع** (mol5sat.org):
1. في Namecheap → **Advanced DNS**
2. أضف CNAME:
   - Host: `@` 
   - Value: `your-app.up.railway.app`
3. في Railway → **Settings** → **Custom Domain** → أضف `mol5sat.org`
4. Railway بيوفر SSL تلقائياً لأي دومين مخصص

---

## الخطوة 7 — تحديث DOMAIN في الـ Variables

بعد ما تحصل على URL:
1. ارجع لـ **Variables**
2. غيّر `DOMAIN` و`SITE_URL` للـ URL الحقيقي
3. Railway هيعيد النشر — انتظر دقيقتين

---

## الخطوة 8 — اختبر كل شيء

افتح في المتصفح:
```
https://your-app.up.railway.app/api/health
```
يجب أن يظهر: `{"status":"ok","time":"...","version":"1.0.0"}`

ثم:
```
https://your-app.up.railway.app/api/summaries?sort=recommended
```
يجب أن يظهر JSON فيه الملخصات التجريبية

ثم:
```
https://your-app.up.railway.app/
```
يجب أن يفتح موقع Mol5sat

---

## ماذا يحدث كل مرة تعدّل الكود؟

1. تعدّل ملف على جهازك
2. تفتح GitHub Desktop → **"Commit to main"** → **"Push origin"**
3. Railway يكتشف التغيير تلقائياً ويعيد النشر في 2-3 دقائق
4. الموقع يتحدث بدون أي تدخل منك

---

## مقارنة الخيارات المجانية الكاملة

| الخدمة | SQLite | مجاني | سرعة | ملاحظات |
|---|---|---|---|---|
| **Railway** | ✅ (مع Volume) | ✅ ($5 credit) | ⚡⚡⚡ | **الأفضل للمشاريع الحقيقية** |
| Render | ✅ (Disk) | ✅ (ينام بعد 15 دق) | ⚡⚡ | الـ free tier بيصحى ببطء |
| Fly.io | ✅ (Volume) | ✅ (3 VMs مجاناً) | ⚡⚡⚡ | يحتاج CLI، أصعب قليلاً |
| Vercel | ❌ | ✅ | ⚡⚡⚡⚡ | للـ frontend فقط، مش للـ backend |
| Netlify | ❌ | ✅ | ⚡⚡⚡ | نفس Vercel |

### توصيتي:
- **Railway** للمشروع الجاد — بيشتغل بدون إعداد، التحديث تلقائي، Volume رخيصة
- **Render** لو عايز مجاني 100% — لكن الـ free tier "بينام" لو محدش فتح الموقع 15 دقيقة

---

## لو الـ deployment فشل

في Railway، اضغط على الـ service ثم **"Deployments"** ثم اضغط على آخر deployment فاشل وشوف الـ **"Build Logs"** و**"Deploy Logs"**.

الأخطاء الشائعة:
- `Cannot find module 'better-sqlite3'` → ده native module، Railway لازم يبنيه. الحل: أضف `NODE_OPTIONS=--max-old-space-size=512` في الـ Variables
- `ENOENT: no such file or directory '/data/mol5sat.db'` → تأكد إن الـ Volume متوصّل على `/data`
- `JWT_SECRET is still the default` → غيّر JWT_SECRET في الـ Variables
