-- Founder-facing changelog for Souqna Reviews.

begin;

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href, image_url,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  '41f463a5-3315-44d2-b363-7a24eb7b9b77',
  'Introducing Souqna Reviews',
  'Souqna Reviews is a new storefront plugin for collecting and displaying customer reviews in Arabic or English. Enable the plugin from Apps, add a Souqna Reviews section in Builder, and let visitors submit feedback from the storefront. New reviews appear in the Reviews tab where merchants can publish, hide, feature, delete, and choose what should show publicly.',
  'feature',
  'v2.08',
  140,
  now(),
  'Collect bilingual customer reviews from the storefront, moderate them in Apps, and display approved social proof with Builder review sections.',
  'Apps',
  'Enable Souqna Reviews',
  '/account/apps/reviews',
  '/account/apps/reviews',
  null,
  true,
  false,
  '{}'::jsonb,
  '{
    "kind": "souqna-reviews",
    "route": "/account/apps/reviews",
    "features": [
      "reviews-plugin",
      "builder-review-components",
      "visitor-review-submissions",
      "pending-review-moderation",
      "publish-hide-feature-delete",
      "display-controls",
      "arabic-english-support"
    ],
    "howToUse": [
      "Open Account > Apps > Souqna Reviews.",
      "Enable the plugin for the selected store.",
      "Open Builder and add a Souqna Reviews component.",
      "Visitors can write reviews from the storefront.",
      "Return to Apps > Souqna Reviews to publish, hide, feature, delete, and control what appears publicly."
    ],
    "i18n": {
      "en": {
        "title": "Introducing Souqna Reviews",
        "summary": "Collect bilingual customer reviews from the storefront, moderate them in Apps, and display approved social proof with Builder review sections.",
        "body": "Souqna Reviews is a new storefront plugin for collecting and displaying customer reviews in Arabic or English. Enable the plugin from Apps, add a Souqna Reviews section in Builder, and let visitors submit feedback from the storefront. New reviews appear in the Reviews tab where merchants can publish, hide, feature, delete, and choose what should show publicly.",
        "badge": "Apps",
        "ctaLabel": "Enable Souqna Reviews"
      },
      "ar": {
        "title": "تقديم تقييمات سوقنا",
        "summary": "اجمع تقييمات العملاء بالعربية أو الإنجليزية من واجهة المتجر، راجعها من التطبيقات، واعرض التقييمات المعتمدة داخل أقسام التقييمات في البنّاء.",
        "body": "تقييمات سوقنا إضافة جديدة للمتجر تتيح جمع وعرض تقييمات العملاء بالعربية أو الإنجليزية. فعّل الإضافة من التطبيقات، أضف قسم تقييمات سوقنا من البنّاء، ودع الزوار يرسلون تقييماتهم من واجهة المتجر. تظهر التقييمات الجديدة في تبويب التقييمات حيث يستطيع التاجر نشرها، إخفاءها، تمييزها، حذفها، والتحكم بما يظهر للزوار.",
        "badge": "التطبيقات",
        "ctaLabel": "تفعيل تقييمات سوقنا"
      }
    }
  }'::jsonb,
  '{}'::jsonb
) on conflict (id) do update
  set title = excluded.title,
      body = excluded.body,
      type = excluded.type,
      version = excluded.version,
      priority = excluded.priority,
      summary = excluded.summary,
      badge = excluded.badge,
      cta_label = excluded.cta_label,
      cta_href = excluded.cta_href,
      details_href = excluded.details_href,
      image_url = excluded.image_url,
      is_active = excluded.is_active,
      is_sticky = excluded.is_sticky,
      audience = excluded.audience,
      preview_payload = excluded.preview_payload,
      banner_payload = excluded.banner_payload,
      updated_at = now();

commit;
