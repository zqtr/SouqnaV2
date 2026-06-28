import type { Plan } from '@/lib/plans';
import type { BlockType } from './types';

export type ComponentLibraryGroupId =
  | 'layout'
  | 'products'
  | 'plugins'
  | 'contact'
  | 'animation'
  | 'spacing';

export type ComponentLibraryItem = {
  type: BlockType;
  label: string;
  hint: string;
  tier?: Plan;
  description: {
    en: string;
    ar: string;
  };
};

export type ComponentLibraryGroup = {
  id: ComponentLibraryGroupId;
  label: string;
  items: ComponentLibraryItem[];
};

export const COMPONENT_LIBRARY_GROUPS: ComponentLibraryGroup[] = [
  {
    id: 'layout',
    label: 'Layout',
    items: [
      {
        type: 'hero',
        label: 'Hero',
        hint: 'Editorial title + tagline',
        description: {
          en: 'The opening section for a storefront. Use it for the brand name, promise, visual direction, and the first action a visitor should take.',
          ar: 'القسم الافتتاحي للمتجر. استخدمه لاسم العلامة، الوعد، الاتجاه البصري، وأول إجراء تريد من الزائر اتخاذه.',
        },
      },
      {
        type: 'banner',
        label: 'Banner',
        hint: 'Full-width image',
        description: {
          en: 'A wide visual moment for campaigns, collections, announcements, or mood-setting photography with optional overlay copy.',
          ar: 'مساحة بصرية عريضة للحملات أو المجموعات أو الإعلانات أو الصور التي تحدد مزاج الصفحة مع نص اختياري فوقها.',
        },
      },
      {
        type: 'text',
        label: 'Text',
        hint: 'Section copy',
        description: {
          en: 'A focused writing block for founder notes, explanations, policies, process, value propositions, or editorial storytelling.',
          ar: 'كتلة كتابة مركزة لملاحظات المؤسس، الشرح، السياسات، خطوات العمل، القيمة المقترحة، أو السرد التحريري.',
        },
      },
      {
        type: 'image',
        label: 'Image',
        hint: 'Single picture',
        description: {
          en: 'A single image with controlled width, aspect ratio, alt text, and caption. Best for product detail, place, proof, or process.',
          ar: 'صورة واحدة مع تحكم في العرض والنسبة والنص البديل والتعليق. مناسبة لتفاصيل المنتج أو المكان أو الإثبات أو خطوات العمل.',
        },
      },
      {
        type: 'gallery',
        label: 'Gallery',
        hint: 'Image grid',
        description: {
          en: 'A grid of images for collections, looks, venues, before-and-after stories, or any page that needs visual scanning.',
          ar: 'شبكة صور للمجموعات، الإطلالات، المواقع، قصص قبل وبعد، أو أي صفحة تحتاج إلى تصفح بصري سريع.',
        },
      },
      {
        type: 'shadcnNavbar',
        label: 'Premium navbar',
        hint: 'Souqna premium routing chrome',
        tier: 'pro',
        description: {
          en: 'A paid storefront navigation block using real Souqna routes, logo, product index, policy links, and cart actions.',
          ar: 'شريط تنقل مدفوع يستخدم روابط سوقنا الحقيقية والشعار وصفحة المنتجات والسياسات والسلة.',
        },
      },
      {
        type: 'shadcnHero',
        label: 'Premium hero',
        hint: 'Souqna premium ecommerce hero',
        tier: 'pro',
        description: {
          en: 'A premium ecommerce hero built for live products, bilingual copy, strong CTAs, and mobile-first commerce layouts.',
          ar: 'واجهة تجارة مميزة للمنتجات الحية والنص ثنائي اللغة وأزرار واضحة وتجربة جوال أفضل.',
        },
      },
      {
        type: 'shadcnTrustStrip',
        label: 'Trust strip',
        hint: 'Checkout, delivery, support proof',
        tier: 'pro',
        description: {
          en: 'A compact proof strip for delivery, payment, support, and store trust points merchants can edit.',
          ar: 'شريط ثقة مختصر للتوصيل والدفع والدعم ونقاط الثقة التي يمكن للتاجر تعديلها.',
        },
      },
      {
        type: 'shadcnFooter',
        label: 'Premium footer',
        hint: 'Routing, policies, WhatsApp',
        tier: 'pro',
        description: {
          en: 'A commerce footer with store routing, policy links, and WhatsApp support when the store phone is configured.',
          ar: 'تذييل تجاري بروابط المتجر والسياسات ودعم واتساب عند إعداد رقم المتجر.',
        },
      },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    items: [
      {
        type: 'productGrid',
        label: 'Product grid',
        hint: 'Cards layout',
        description: {
          en: 'A responsive catalogue grid that pulls live products from the store and lets shoppers browse cards quickly.',
          ar: 'شبكة كتالوج متجاوبة تسحب المنتجات الحية من المتجر وتساعد المتسوقين على تصفح البطاقات بسرعة.',
        },
      },
      {
        type: 'productList',
        label: 'Product list',
        hint: 'Linear rows',
        description: {
          en: 'A list-style catalogue for menus, service lines, grouped categories, and stores that need readable product rows.',
          ar: 'كتالوج بأسلوب القائمة للمنايو، الخدمات، الفئات المجمعة، والمتاجر التي تحتاج صفوف منتجات سهلة القراءة.',
        },
      },
      {
        type: 'featuredProduct',
        label: 'Featured',
        hint: 'Hero product',
        description: {
          en: 'A single hero product pulled from the catalogue. Use it to spotlight a best seller, launch item, or anchor offer.',
          ar: 'منتج واحد بارز من الكتالوج. استخدمه لإبراز الأكثر مبيعاً أو منتج الإطلاق أو العرض الأساسي.',
        },
      },
      {
        type: 'shadcnCategories',
        label: 'Premium categories',
        hint: 'Live category tiles',
        tier: 'pro',
        description: {
          en: 'Visual category browsing powered by the store catalogue so shoppers can enter product families quickly.',
          ar: 'تصفح بصري للتصنيفات مرتبط بكتالوج المتجر حتى يدخل العملاء إلى مجموعات المنتجات بسرعة.',
        },
      },
      {
        type: 'shadcnProductCard',
        label: 'Premium cards',
        hint: 'Souqna premium product cards',
        tier: 'pro',
        description: {
          en: 'Premium product cards with real prices, images, availability, detail links, and add-to-cart support.',
          ar: 'بطاقات منتجات مميزة تعرض الأسعار والصور والتوفر وروابط التفاصيل والإضافة للسلة.',
        },
      },
      {
        type: 'shadcnProductList',
        label: 'Premium list',
        hint: 'High-signal product rows',
        tier: 'pro',
        description: {
          en: 'A clean product list for best sellers, edits, and comparison-heavy catalogue sections.',
          ar: 'قائمة منتجات نظيفة للأكثر مبيعاً والمختارات والأقسام التي تحتاج مقارنة سريعة.',
        },
      },
      {
        type: 'shadcnProductDetail',
        label: 'Premium detail',
        hint: 'Selected product buy surface',
        tier: 'atelier',
        description: {
          en: 'A Max+ product detail surface for one selected product with image, price, description, and buying action.',
          ar: 'واجهة تفاصيل منتج في Max+ لمنتج محدد مع الصورة والسعر والوصف وزر الشراء.',
        },
      },
      {
        type: 'shadcnQuickView',
        label: 'Quick view',
        hint: 'Compact product checkout card',
        tier: 'atelier',
        description: {
          en: 'A compact Max+ quick-view product card for launch pages and short product stories.',
          ar: 'بطاقة عرض سريع مضغوطة في Max+ لصفحات الإطلاق وقصص المنتجات القصيرة.',
        },
      },
      {
        type: 'shadcnReviews',
        label: 'Reviews',
        hint: 'Bilingual social proof',
        tier: 'pro',
        description: {
          en: 'Editable bilingual review cards for social proof, product trust, and premium storefront credibility.',
          ar: 'بطاقات تقييم قابلة للتعديل باللغتين لتعزيز الثقة ومصداقية واجهة المتجر.',
        },
      },
      {
        type: 'shadcnOrderSummary',
        label: 'Order summary',
        hint: 'Checkout-inspired value stack',
        tier: 'atelier',
        description: {
          en: 'A Max+ checkout-inspired summary section for payment confidence, totals, and order reassurance.',
          ar: 'قسم ملخص مستوحى من الدفع في Max+ لتعزيز الثقة بالمبالغ والطلب.',
        },
      },
      {
        type: 'shadcnOfferModal',
        label: 'Offer module',
        hint: 'Launch discount preview',
        tier: 'atelier',
        description: {
          en: 'A controlled Max+ offer module for launch edits, discount messaging, and highlighted product rails.',
          ar: 'وحدة عرض مضبوطة في Max+ لإطلاق العروض ورسائل الخصم وإبراز المنتجات.',
        },
      },
      {
        type: 'productCardStack',
        label: 'Card stack',
        hint: 'Layered product card · hover to fan',
        tier: 'atelier',
        description: {
          en: 'A premium layered product card that adds depth around one selected product and gives the page a tactile commerce feel.',
          ar: 'بطاقة منتج مميزة بطبقات تضيف عمقاً حول منتج محدد وتعطي الصفحة إحساساً تجارياً ملموساً.',
        },
      },
      {
        type: 'productPromoCard',
        label: 'Promo card',
        hint: 'Single product · tags reveal · add-to-cart',
        tier: 'atelier',
        description: {
          en: 'A promotional product card with badges, hover treatment, and add-to-cart support for launches, edits, and featured offers.',
          ar: 'بطاقة ترويج لمنتج واحد مع شارات وحركة عند المرور ودعم الإضافة للسلة للإطلاقات والعروض المختارة.',
        },
      },
      {
        type: 'ecommerce1',
        label: 'Product gallery',
        hint: 'Compact gallery, sizes, add-to-bag',
        tier: 'atelier',
        description: {
          en: 'A detailed product gallery with images, sizes, colors, details, and a compact buying surface.',
          ar: 'معرض منتج تفصيلي يضم الصور والمقاسات والألوان والتفاصيل ومساحة شراء مركزة.',
        },
      },
      {
        type: 'ecommerce2',
        label: 'Shop filters',
        hint: 'Sidebar filters and product cards',
        tier: 'atelier',
        description: {
          en: 'A shop layout with filter controls and product cards for larger catalogues where shoppers compare quickly.',
          ar: 'تخطيط متجر مع أدوات تصفية وبطاقات منتجات للكتالوجات الأكبر حيث يحتاج المتسوق للمقارنة بسرعة.',
        },
      },
      {
        type: 'ecommerce3',
        label: 'Color detail',
        hint: 'Color swatches and product tabs',
        tier: 'atelier',
        description: {
          en: 'A product detail block focused on color choices, image swaps, tabs, sizes, and product information.',
          ar: 'كتلة تفاصيل منتج تركز على خيارات الألوان وتبديل الصور والتبويبات والمقاسات ومعلومات المنتج.',
        },
      },
      {
        type: 'ecommerce4',
        label: 'Drop product',
        hint: 'Limited drop with reserve/notify',
        tier: 'atelier',
        description: {
          en: 'A limited-release product block for scarcity, reservations, availability notes, and launch-style buying moments.',
          ar: 'كتلة منتج لإصدار محدود تعرض الندرة والحجز وملاحظات التوفر ولحظات الشراء المرتبطة بالإطلاق.',
        },
      },
      {
        type: 'ecommerce5',
        label: 'Editorial shelf',
        hint: 'Hero product with compact shelf',
        tier: 'atelier',
        description: {
          en: 'An editorial commerce shelf that mixes one lead product with supporting items and brand-forward copy.',
          ar: 'رف تجاري تحريري يمزج منتجاً رئيسياً مع منتجات داعمة ونص يبرز هوية العلامة.',
        },
      },
      {
        type: 'ecommerce6',
        label: 'Category shop',
        hint: 'Tabs and category product grid',
        tier: 'atelier',
        description: {
          en: 'A category-led shop section with tabs and product cards for organizing catalogue browsing by customer intent.',
          ar: 'قسم متجر يقوده تصنيف الفئات مع تبويبات وبطاقات منتجات لتنظيم التصفح حسب نية العميل.',
        },
      },
      {
        type: 'ecommerce7',
        label: 'Category tiles',
        hint: 'Tabbed visual category grid',
        tier: 'pro',
        description: {
          en: 'A visual category grid for guiding visitors into product families, edits, collections, or seasonal groupings.',
          ar: 'شبكة فئات بصرية توجه الزوار إلى عائلات المنتجات أو المختارات أو المجموعات أو التصنيفات الموسمية.',
        },
      },
      {
        type: 'menu',
        label: 'Menu',
        hint: 'Cafe-style price list',
        description: {
          en: 'A bilingual price-list pattern for cafes, kitchens, services, workshops, and any offer that reads best as rows.',
          ar: 'نمط قائمة أسعار ثنائية اللغة للمقاهي والمطابخ والخدمات والورش وأي عرض يُقرأ بشكل أفضل كصفوف.',
        },
      },
      {
        type: 'serviceList',
        label: 'Services',
        hint: 'Bordered service cards',
        description: {
          en: 'Structured service cards with descriptions and prices for appointments, packages, consulting, and custom work.',
          ar: 'بطاقات خدمات منظمة مع الوصف والأسعار للمواعيد والباقات والاستشارات والأعمال المخصصة.',
        },
      },
      {
        type: 'calendar',
        label: 'Calendar',
        hint: 'Dated agenda',
        description: {
          en: 'A dated agenda for classes, pop-ups, drops, bookable sessions, workshops, and time-based availability.',
          ar: 'أجندة بتواريخ للدروس والفعاليات المؤقتة والإصدارات والجلسات القابلة للحجز والورش والتوفر الزمني.',
        },
      },
    ],
  },
  {
    id: 'plugins',
    label: 'Souqna plugins',
    items: [
      {
        type: 'drop',
        label: 'Drop (Drop Manager)',
        hint: 'Timed launch · waitlist',
        description: {
          en: 'A plugin-powered launch block for timed drops, countdowns, live product releases, sold-out states, and waitlists.',
          ar: 'كتلة إطلاق تعمل عبر إضافة لإدارة الإصدارات المؤقتة والعد التنازلي وطرح المنتجات ونفاد الكمية وقوائم الانتظار.',
        },
      },
      {
        type: 'taqim',
        label: 'Bundle (Taqim)',
        hint: '3 layouts · product/bundle picker',
        description: {
          en: 'A bundle and complete-the-look block that reads Taqim settings and turns related products into one higher-value offer.',
          ar: 'كتلة للباقات وإكمال الإطلالة تقرأ إعدادات تقييم وتحول المنتجات المرتبطة إلى عرض أعلى قيمة.',
        },
      },
      {
        type: 'mawid',
        label: 'Countdown (Mawid)',
        hint: '3 layouts · product/time picker',
        description: {
          en: 'A countdown and scheduling block for launches, appointments, timed offers, pre-orders, and live moments.',
          ar: 'كتلة عد تنازلي وجدولة للإطلاقات والمواعيد والعروض المؤقتة والطلبات المسبقة واللحظات المباشرة.',
        },
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    items: [
      {
        type: 'contactCard',
        label: 'Contact',
        hint: 'Phone/area/hours',
        description: {
          en: 'A practical contact card for phone, area, hours, Instagram, and custom profile details.',
          ar: 'بطاقة تواصل عملية للهاتف والمنطقة وساعات العمل وإنستغرام وتفاصيل الملف المخصصة.',
        },
      },
      {
        type: 'inquireCta',
        label: 'Inquire CTA',
        hint: 'Standalone button',
        description: {
          en: 'A focused call-to-action for inquiries, bookings, WhatsApp conversations, custom orders, or quote requests.',
          ar: 'دعوة مركزة لاتخاذ إجراء للاستفسارات والحجوزات ومحادثات واتساب والطلبات المخصصة وطلبات التسعير.',
        },
      },
    ],
  },
  {
    id: 'animation',
    label: 'Animation',
    items: [
      {
        type: 'animatedText',
        label: 'Animated text',
        hint: 'Reveal · kinetic · wave · type · glitch',
        tier: 'pro',
        description: {
          en: 'A motion headline or statement for first-scroll moments, campaign emphasis, or a page break with energy.',
          ar: 'عنوان أو عبارة متحركة للحظات الظهور الأولى أو إبراز الحملات أو فاصل صفحة فيه طاقة.',
        },
      },
      {
        type: 'animatedImage',
        label: 'Animated image',
        hint: 'Parallax · magnetic · ken-burns · tilt',
        tier: 'pro',
        description: {
          en: 'A motion-treated image for parallax, magnetic hover, ken-burns, or tilt effects without custom code.',
          ar: 'صورة بتأثير حركة مثل البارالاكس أو المغناطيسية أو كين بيرنز أو الميل من دون كتابة كود.',
        },
      },
      {
        type: 'tiltImage',
        label: 'Tilt image',
        hint: 'Hover lifts + tilts left or right',
        tier: 'pro',
        description: {
          en: 'A premium image card that lifts and tilts on hover, useful for campaigns, objects, places, and editorial imagery.',
          ar: 'بطاقة صورة مميزة ترتفع وتميل عند المرور، مناسبة للحملات والأشياء والأماكن والصور التحريرية.',
        },
      },
      {
        type: 'spotlightCard',
        label: 'Spotlight card',
        hint: 'Bold card · date badge · hover rises',
        tier: 'pro',
        description: {
          en: 'A bold content card with date, pattern, CTA, and hover lift for announcements, events, drops, or featured notes.',
          ar: 'بطاقة محتوى بارزة مع تاريخ ونمط وزر وحركة ارتفاع للإعلانات والفعاليات والإصدارات والملاحظات المختارة.',
        },
      },
      {
        type: 'depthShowcase',
        label: 'Depth showcase',
        hint: 'Parallax depth card · one per page',
        tier: 'pro',
        description: {
          en: 'A parallax depth card for one strong image and short story. Use it sparingly for premium highlights.',
          ar: 'بطاقة عمق بتأثير بارالاكس لصورة قوية وقصة قصيرة. استخدمها باعتدال لإبراز اللحظات المميزة.',
        },
      },
      {
        type: 'auroraRibbon',
        label: 'Aurora ribbon',
        hint: 'Gradient WebGL strip · use sparingly',
        tier: 'pro',
        description: {
          en: 'A narrow animated aurora strip for short feature breaks, atmospheric transitions, and premium visual rhythm.',
          ar: 'شريط أورورا متحرك ضيق لفواصل المزايا القصيرة والانتقالات البصرية وإيقاع الصفحة المميز.',
        },
      },
      {
        type: 'curvedLoop',
        label: 'Curved loop',
        hint: 'Curved text loop · draggable',
        tier: 'pro',
        description: {
          en: 'A curved text marquee for premium campaign lines, product suite statements, and moving editorial separators.',
          ar: 'شريط نصي منحني لعبارات الحملات الفاخرة ورسائل حزم المنتجات والفواصل التحريرية المتحركة.',
        },
      },
      {
        type: 'showcase1',
        label: 'Case switcher',
        hint: 'Active image list and compact story',
        tier: 'pro',
        description: {
          en: 'A compact story switcher with active imagery for use cases, gift guides, launch edits, or service paths.',
          ar: 'مبدل قصص مختصر مع صور نشطة لحالات الاستخدام أو أدلة الهدايا أو مختارات الإطلاق أو مسارات الخدمات.',
        },
      },
      {
        type: 'showcase2',
        label: 'Image marquee',
        hint: 'Draggable horizontal carousel',
        tier: 'pro',
        description: {
          en: 'A draggable horizontal showcase for campaigns, lookbooks, portfolios, visual proof, or gallery-led browsing.',
          ar: 'معرض أفقي قابل للسحب للحملات واللوكبوك والمحافظ والأدلة البصرية والتصفح القائم على الصور.',
        },
      },
      {
        type: 'showcase3',
        label: '3D story wheel',
        hint: '3D triangular carousel',
        tier: 'pro',
        description: {
          en: 'A 3D carousel for a small set of stories, projects, collections, or signature offers.',
          ar: 'كاروسيل ثلاثي الأبعاد لمجموعة صغيرة من القصص أو المشاريع أو المجموعات أو العروض المميزة.',
        },
      },
      {
        type: 'showcase4',
        label: 'Filter portfolio',
        hint: 'Filterable project grid',
        tier: 'pro',
        description: {
          en: 'A filterable portfolio grid for projects, case studies, makers, product stories, or press highlights.',
          ar: 'شبكة محفظة قابلة للتصفية للمشاريع ودراسات الحالة والصناع وقصص المنتجات والظهور الإعلامي.',
        },
      },
      {
        type: 'showcase5',
        label: 'Tabbed image rail',
        hint: 'Tabbed creator showcase',
        tier: 'pro',
        description: {
          en: 'A tabbed image rail for teams, creators, categories, events, or any story split into named groups.',
          ar: 'شريط صور بتبويبات للفرق أو المبدعين أو الفئات أو الفعاليات أو أي قصة مقسمة إلى مجموعات مسماة.',
        },
      },
    ],
  },
  {
    id: 'spacing',
    label: 'Spacing',
    items: [
      {
        type: 'spacer',
        label: 'Spacer',
        hint: 'Vertical breather',
        description: {
          en: 'A silent vertical pause that gives sections room and improves the rhythm of long pages.',
          ar: 'مسافة عمودية هادئة تمنح الأقسام مساحة وتحسن إيقاع الصفحات الطويلة.',
        },
      },
      {
        type: 'divider',
        label: 'Divider',
        hint: 'Horizontal rule',
        description: {
          en: 'A thin separator for ending one idea, grouping related blocks, or adding structure without visual weight.',
          ar: 'فاصل رفيع لإنهاء فكرة أو جمع كتل مرتبطة أو إضافة بنية من دون ثقل بصري.',
        },
      },
    ],
  },
];

export const COMPONENT_LIBRARY_ITEMS = COMPONENT_LIBRARY_GROUPS.flatMap((group) => group.items);

export const COMPONENT_LIBRARY_TYPES = COMPONENT_LIBRARY_ITEMS.map((item) => item.type);

export function getComponentLibraryItem(type: BlockType): ComponentLibraryItem | undefined {
  return COMPONENT_LIBRARY_ITEMS.find((item) => item.type === type);
}
