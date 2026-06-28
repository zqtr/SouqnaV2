-- Founder-facing changelog for Builder system pages:
-- All Products with filters and editable Checkout design controls.

begin;

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href, image_url,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  '8d6f5f57-6f5d-4e73-9fd7-a2c9668fe667',
  'Builder system pages: All Products and Checkout',
  'Builder now includes two controlled commerce system pages. Turn on All Products from Builder > Pages to add a full catalogue page with search, category filters, price filter, availability filter, sort controls, category visibility, and product hide/show controls. Open Checkout from Builder > Pages to edit checkout hero text, address style, background, button style, trust badges, delivery notes, payment method cards, order summary layout, and thank-you page style. To apply changes, open Builder > Pages, choose Checkout or All Products, edit the right-side controls, wait for the Saved state, then refresh the preview or open the live storefront.',
  'feature',
  'v2.07',
  136,
  now(),
  'All Products can now be added as a system page with merchant filters, and Checkout can be edited safely from Builder.',
  'Builder',
  'Open Builder',
  '/account/builder',
  '/account/builder',
  '/updates/builder-system-pages.png',
  true,
  false,
  '{}'::jsonb,
  '{
    "kind": "builder-system-pages",
    "route": "/account/builder",
    "screenshots": ["/updates/builder-system-pages.png"],
    "features": [
      "all-products-system-page",
      "product-search",
      "category-filters",
      "price-filter",
      "availability-filter",
      "product-hide-show",
      "editable-checkout-page",
      "checkout-address-design",
      "checkout-trust-badges",
      "checkout-order-summary-layout",
      "checkout-thank-you-style"
    ],
    "howToUse": [
      "Open Builder > Pages.",
      "Turn on All Products to add the catalogue page.",
      "Open All Products to edit filters, categories, sort, availability, and product visibility.",
      "Open Checkout to edit checkout copy, address design, background, buttons, trust badges, payment cards, order summary, and thank-you styling.",
      "Wait for the Saved state, then refresh the preview or open the live storefront."
    ],
    "i18n": {
      "en": {
        "title": "Builder system pages: All Products and Checkout",
        "summary": "All Products can now be added as a system page with merchant filters, and Checkout can be edited safely from Builder.",
        "body": "Builder now includes two controlled commerce system pages. Turn on All Products from Builder > Pages to add a full catalogue page with search, category filters, price filter, availability filter, sort controls, category visibility, and product hide/show controls. Open Checkout from Builder > Pages to edit checkout hero text, address style, background, button style, trust badges, delivery notes, payment method cards, order summary layout, and thank-you page style. To apply changes, open Builder > Pages, choose Checkout or All Products, edit the right-side controls, wait for the Saved state, then refresh the preview or open the live storefront.",
        "badge": "Builder"
      },
      "ar": {
        "title": "صفحات النظام في الباني: كل المنتجات والدفع",
        "summary": "يمكنك الآن إضافة صفحة كل المنتجات مع فلاتر يتحكم بها التاجر، وتعديل صفحة الدفع بأمان من الباني.",
        "body": "أصبح الباني يدعم صفحتين تجاريتين بنظام مضبوط. من Builder > Pages فعّل صفحة كل المنتجات لإضافة كتالوج كامل يحتوي على البحث، فلاتر الفئات، فلتر السعر، فلتر التوفر، ترتيب المنتجات، التحكم بالفئات الظاهرة، وإظهار أو إخفاء المنتجات. افتح صفحة Checkout من نفس المكان لتعديل عنوان الدفع، شكل حقول العنوان، الخلفية، شكل الأزرار، شارات الثقة، ملاحظات التوصيل، بطاقات طرق الدفع، ترتيب ملخص الطلب، وتصميم صفحة الشكر. لتطبيق التغييرات: افتح Builder > Pages، اختر Checkout أو All Products، عدّل الإعدادات من اللوحة اليمنى، انتظر ظهور حالة الحفظ، ثم حدّث المعاينة أو افتح المتجر المباشر.",
        "badge": "الباني"
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
