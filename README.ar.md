# Souqna

**الجمهور:** المطوّرين · **English:** [README.md](README.md)

Souqna منصّة واجهات وتجارة ثنائية اللغة (إنجليزي / عربي مع RTL كامل) للمؤسّسين: لوحة تحكم بعد تسجيل الدخول، محرّر صفحات مرئي، مسارات المنتجات والطلبات، الخطط والفوترة، وسوق تطبيقات **لكل متجر على حدة**. المتاجر العامة تُعرَض ضمن نطاق الـ brief؛ و**Souqy** يضيف حزمة واجهة مولَّدة بالذكاء الاصطناعي عندما يكون للمتجر إصدار Souqy منشور.

## التقنية

- **Next.js 14** (App Router)، TypeScript، Tailwind v4، **next-intl** (`en` / `ar`)
- مصادقة **Clerk**
- **Neon Postgres** عبر `@neondatabase/serverless` (SQL بنمط القوالب فقط)
- تخزين **Vercel Blob**
- **Vercel AI SDK** وبوابة AI (على Vercel OIDC؛ محلياً `AI_GATEWAY_API_KEY`)
- **Postmark** (معاملات) + **Resend** (إرث / تسويق) عبر `src/lib/mailer.ts`
- **Sentry**، **PostHog**، **Vercel Analytics**

اتفاقيات المساهمة للتفاصيل: [AGENTS.md](AGENTS.md).

## أين يوجد كل شيء

| المجال | المسار |
|--------|--------|
| التوجيه، البوابة، الـ subdomain | `src/middleware.ts` |
| متغيّرات البيئة | `src/lib/env.ts` |
| وصف تطبيقات السوق | `src/lib/apps/registry.ts` |
| توليد Souqy والتحقق | `src/lib/souqy/` |
| إجراءات Souqy على السيرفر | `src/app/actions/souqy.ts` |
| مساحة Souqy Studio | `src/app/begin/souqy/page.tsx`, `src/app/[locale]/begin/souqy/page.tsx`, `src/components/sections/begin/souqy-studio/` |
| واجهة البنّاء | `src/components/builder/BuilderShell.tsx`, `src/app/account/builder/page.tsx` |
| بلوك Souqy Portal | `src/components/storefront/blocks/PortalHeroBlock.tsx`, `src/lib/blocks/types.ts`, `src/sdk/components.tsx` |
| الواجهة العامة للمتجر | `src/app/brief/[slug]/[[...path]]/page.tsx` |
| معاينة المسودّة (iframe البنّاء) | `src/app/account/[slug]/preview/page.tsx` |
| الصفحة التسويقية (`/`، `/ar`، …) | `src/app/[locale]/page.tsx`, `src/components/souqna/SouqnaHomeExperience.tsx`, هيدر وفوتر مملوكان للصفحة |

تستخدم الصفحة العامة، الدليل، الصفحات القانونية، الدفتر، وملاحظات المنتج المكتوبة بـ Markdown نظام Souqna التحريري الحالي:

- **الألوان:** الأسود `#0A0A0A`، الفحم `#2A2A2A`، الكريم `#E8DCC4`، الحدود الهادئة `#D1C7B2`، النص الفاتح `#F7F7F3`، والأبيض `#FFFFFF`.
- **الخطوط:** Exo 2 للإنجليزية، Thmanyah Serif Display Bold لعناوين العربية، Thmanyah Sans أو Thmanyah Serif Text لنصوص العربية، وJetBrains Mono للوسوم التشغيلية الصغيرة.
- **لغة الصفحة الرئيسية:** خلفية halftone رمادية/كريمية حيّة، شريط تنقّل كبسولي، شعارات تكاملات SVG أحادية اللون، خطوط شبكة رفيعة، بطاقات هادئة، ومن دون ألوان برتقالية أو بنفسجية أو زرقاء بنمط SaaS عام.
- **الخطط:** مجاني، Pro بسعر `QR 49/mo`، Pro+ بسعر `QR 145/mo`، Max+ بسعر `QR 235/mo`؛ أبقِ النصوص متطابقة مع `src/lib/plans.ts` وقسم `#plans` في الصفحة الرئيسية.

نظرة منتج للمؤسّسين وجدول التكاملات: [docs/README.ar.md](docs/README.ar.md).

## التطوير المحلي

1. أنشئ `.env.local` من مدير الأسرار الخاص وعبّئ القيم المطلوبة في `src/lib/env.ts`.
2. ثبّت الحزم وشغّل السيرفر المحلي (`npm install`, `npm run dev`).
3. البناء للإنتاج يشغّل `node scripts/migrate.mjs` قبل `next build`؛ تأكد أن اتصال قاعدة البيانات يسمح بالهجرات عند تجربة البناء محلياً.

إذا ظهر خطأ مثل `Cannot find module './vendor-chunks/@vercel.js'` (أو ملفات ناقصة تحت `.next/server/vendor-chunks/`)، أوقف السيرفر، نفّذ `rm -rf .next`، ثم شغّل `npm run dev` من جديد — مجلد الإخراج كان غير مكتمل أو قديماً.

## أمان الإنتاج

هذا المستودع هو واجهة Souqna على الويب لمشروع Vercel باسم `souqna`. لا تستخدمه كجذر لتطبيق Flutter/mobile، ولا تُدخل مجلدات تطبيقات الجوال في نشر `souqna.qa`.

سكريبتات الحزمة الحالية هي `dev`، `migrate`، `build`، `start`، `lint`، `typecheck`، `format`، و`test`. عند النشر للإنتاج، تأكّد يدوياً أو عبر نظام النشر من اسم الحزمة، أصل Git، معرّف مشروع Vercel، الفرع المحمي، نظافة الشجرة، واستثناءات الجوال. خطافات Git المحلية في `.githooks` ويمكن تفعيلها عبر `git config core.hooksPath .githooks`.

لتحقق بناء Next.js فقط محلياً، استخدم `npx next build`. أما `npm run build` فيشغّل `node scripts/migrate.mjs` أولاً، لذلك يحتاج تبعيات الهجرة واتصال قاعدة البيانات.

## تطبيقات أخرى في المستودع

**CranL Runtime** — خدمة Node.js مستقلة للـ API والعمال والصفوف الخاصة بأحمال Souqy Studio والمهام الخلفية. توجد في [apps/cranl-runtime](apps/cranl-runtime/README.md) وتُنشر بشكل منفصل عن واجهة Vercel.

### إعدادات نشر CranL

- المستودع: monorepo الخاص بـ Souqna
- مسار البناء: `/apps/cranl-runtime`
- نوع البناء: Dockerfile
- المنفذ: `3000`

تتصل واجهة Vercel بـ CranL عبر مسارات `/api/cranl/*` على السيرفر. عيّن `CRANL_RUNTIME_URL` و`CRANL_API_KEY` في Vercel، وعيّن نفس `CRANL_API_KEY` في نشر CranL. يحدد `CRANL_DEFAULT_PROVIDER` مزوّد وظائف الذكاء الاصطناعي ويقبل `openai` أو `ollama` أو `huggingface` أو `mock`.

**Fanar / RunPod** — يمكن لـ Souqy Chat استخدام نقطة Fanar خاصة متوافقة مع OpenAI. عيّن `FANAR_API_URL` و`FANAR_API_KEY` و`FANAR_MODEL` و`FANAR_TIMEOUT_MS`؛ نقاط RunPod vLLM غالباً تنتهي بـ `/openai/v1`.

**Souqna Pulse** — سكريبتات Pulse ما زالت موجودة في `package.json`، لكن مجلد `apps/pulse/` غير موجود في هذا checkout. لا تعتبر Pulse تطبيقاً محلياً مدعوماً إلى أن يعود مصدره.
