import { randomUUID } from 'node:crypto';
import {
  COMPONENT_LIBRARY_GROUPS,
  COMPONENT_LIBRARY_TYPES,
  type ComponentLibraryItem,
} from './componentCatalog';
import {
  COMPONENT_SHOWCASE_IMAGES,
  COMPONENT_SHOWCASE_SLUG,
  hasLegacyComponentShowcaseAssets,
} from './componentShowcaseAssets';
import type {
  Block,
  BlockType,
  EcommerceBlockProps,
  EcommerceProduct,
  Showcase1Props,
  Showcase2Props,
  Showcase3Props,
  Showcase4Props,
  Showcase5Props,
  ThemeOverrides,
} from './types';

export { COMPONENT_SHOWCASE_IMAGES, COMPONENT_SHOWCASE_SLUG } from './componentShowcaseAssets';

export const COMPONENT_SHOWCASE_MARKER = 'souqna-component-onboarding-v1';
export const COMPONENT_SHOWCASE_DROP_ID = 'component-showcase';
export const COMPONENT_SHOWCASE_EVENT_ID = 'component-showcase';
export const COMPONENT_SHOWCASE_BUNDLE_ID = 'component-showcase';
export const COMPONENT_SHOWCASE_THEME: ThemeOverrides = {
  palette: 'pearl_ink',
  headingWeight: 400,
  sectionSpacing: 'comfortable',
  themeBehaviour: 'light',
  policyDisplayMode: 'columns',
};

const HERO_IMAGE = COMPONENT_SHOWCASE_IMAGES.identityWide;
const BANNER_IMAGE = COMPONENT_SHOWCASE_IMAGES.newChapter;
const DETAIL_IMAGE = COMPONENT_SHOWCASE_IMAGES.revealExcellence;
const ALT_IMAGE = COMPONENT_SHOWCASE_IMAGES.identityWide;
const WORK_IMAGE = COMPONENT_SHOWCASE_IMAGES.newChapter;
const STUDIO_IMAGE = COMPONENT_SHOWCASE_IMAGES.revealExcellence;
const CERAMIC_IMAGE = COMPONENT_SHOWCASE_IMAGES.revealExcellence;
const COFFEE_IMAGE = COMPONENT_SHOWCASE_IMAGES.newChapter;
const MARKET_IMAGE = COMPONENT_SHOWCASE_IMAGES.identityWide;
const CATEGORY_IMAGE = COMPONENT_SHOWCASE_IMAGES.newChapter;

export function isComponentShowcaseSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === COMPONENT_SHOWCASE_SLUG;
}

export function isComponentShowcaseDraftCurrent(blocks: Block[]): boolean {
  const hasMarker = blocks.some(
    (block) =>
      block.type === 'hero' &&
      typeof block.props.title === 'string' &&
      block.props.title === 'Souqna Component Library',
  );
  if (!hasMarker) return false;

  const presentTypes = new Set(blocks.map((block) => block.type));
  return (
    COMPONENT_LIBRARY_TYPES.every((type) => presentTypes.has(type)) &&
    !hasLegacyComponentShowcaseAssets(blocks)
  );
}

export function buildComponentShowcaseBlocks(): Block[] {
  const blocks: Block[] = [
    block(
      'hero',
      {
        eyebrow: 'Component onboarding / تعريف المكوّنات',
        title: 'Souqna Component Library',
        tagline:
          'Every builder component, shown as an onboarding walkthrough with English and Arabic notes for founders.',
        layout: 'banner',
        backgroundUrl: HERO_IMAGE,
        showLogo: true,
        showGlyph: true,
        cta: { label: 'Explore components', href: '#components-start' },
      },
      { paddingY: 'xl', variant: 'pro-silk', align: 'center' },
    ),
    block(
      'text',
      {
        eyebrow: 'Onboarding / التعريف',
        heading: 'What founders can build here',
        body: 'This page shows the real components available inside the Souqna builder. Each section pairs the live component with a plain description so new founders can understand when to use it.\n\nتعرض هذه الصفحة المكوّنات الحقيقية المتاحة داخل محرر سوقنا. كل قسم يجمع المكوّن المباشر مع وصف واضح ليساعد المؤسسين الجدد على معرفة وقت استخدامه.',
        align: 'center',
      },
      { paddingY: 'md' },
    ),
  ];

  for (const group of COMPONENT_LIBRARY_GROUPS) {
    blocks.push(
      block('divider', { glyph: true, width: 'wide' }, { paddingY: 'sm' }),
      block(
        'text',
        {
          eyebrow: 'Component group / مجموعة مكوّنات',
          heading: group.label,
          body: groupIntro(group.id),
          align: 'start',
        },
        { paddingY: 'sm' },
      ),
    );

    for (const item of group.items) {
      blocks.push(componentDescriptionBlock(item), componentDemoBlock(item.type));
    }
  }

  blocks.push(
    block(
      'inquireCta',
      {
        eyebrow: 'Ready / جاهز',
        title: 'Use these components in your own storefront.',
        body: 'Open the builder, drag the component you need, then tune copy, imagery, products, and bilingual content from the inspector.',
        label: 'Open your builder',
        variant: 'primary',
        align: 'center',
      },
      { paddingY: 'lg', variant: 'pro-chroma' },
    ),
  );

  return blocks;
}

function groupIntro(id: string): string {
  switch (id) {
    case 'layout':
      return 'Core page structure: introductions, storytelling, imagery, and visual rhythm.\n\nبنية الصفحة الأساسية: المقدمات، السرد، الصور، والإيقاع البصري.';
    case 'products':
      return 'Commerce components for catalogues, product focus, services, menus, calendars, and richer shopping sections.\n\nمكوّنات تجارية للكتالوجات، إبراز المنتجات، الخدمات، القوائم، التقاويم، وأقسام التسوق المتقدمة.';
    case 'plugins':
      return 'App-powered blocks that connect the storefront to Souqna marketplace tools such as launches, bundles, and countdowns.\n\nكتل تعمل عبر التطبيقات وتربط واجهة المتجر بأدوات سوقنا مثل الإطلاقات والباقات والعد التنازلي.';
    case 'contact':
      return 'Conversion and contact components for inquiries, bookings, custom orders, and practical business details.\n\nمكوّنات للتحويل والتواصل مخصصة للاستفسارات والحجوزات والطلبات المخصصة وتفاصيل النشاط العملية.';
    case 'animation':
      return 'Motion and premium visual components for pages that need extra presence without custom code.\n\nمكوّنات الحركة والواجهات البصرية المميزة للصفحات التي تحتاج حضوراً أقوى من دون كود مخصص.';
    case 'spacing':
      return 'Quiet structural components that control breathing room, separation, and page pacing.\n\nمكوّنات بنيوية هادئة تضبط المسافات والفواصل وإيقاع الصفحة.';
    default:
      return 'Builder components available in Souqna.\n\nمكوّنات المحرر المتاحة في سوقنا.';
  }
}

function componentDescriptionBlock(item: ComponentLibraryItem): Block {
  return block(
    'text',
    {
      eyebrow: 'Component / مكوّن',
      heading: item.label,
      body: `${item.description.en}\n\n${item.description.ar}`,
      align: 'start',
    },
    { paddingY: 'sm' },
  );
}

function componentDemoBlock(type: BlockType): Block {
  return block(type, componentProps(type), componentStyle(type));
}

function block<T extends BlockType>(
  type: T,
  props: Record<string, unknown>,
  style?: Block['style'],
): Block<T> {
  return {
    id: randomUUID(),
    type,
    props,
    ...(style ? { style } : {}),
  } as Block<T>;
}

function componentStyle(type: BlockType): Block['style'] {
  if (type === 'hero') return { paddingY: 'lg', variant: 'pro-aurora' };
  if (type === 'banner') return { paddingY: 'sm', variant: 'pro-grain' };
  if (type === 'gallery') return { paddingY: 'md', galleryEffect: 'hover-preview' };
  if (type === 'inquireCta') return { paddingY: 'md', variant: 'pro-neon' };
  if (type === 'auroraRibbon') return { paddingY: 'sm' };
  if (type.startsWith('shadcn')) return { paddingY: type === 'shadcnNavbar' ? 'none' : 'md' };
  if (type === 'spacer') return { paddingY: 'none' };
  if (type === 'divider') return { paddingY: 'sm' };
  return { paddingY: 'md' };
}

function componentProps(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return {
        eyebrow: 'Hero / واجهة',
        title: 'A first screen with direction.',
        tagline: 'Use a hero to state the store promise in one memorable moment.',
        layout: 'centered',
        showLogo: true,
        showGlyph: true,
        cta: { label: 'See the offer', href: '/products' },
      };
    case 'banner':
      return {
        imageUrl: BANNER_IMAGE,
        alt: 'Editorial product styling',
        overlayTitle: 'Campaign banner',
        overlaySubtitle: 'A wide visual section for collections, launches, and seasonal stories.',
        scrim: 'soft',
        align: 'center',
      };
    case 'text':
      return {
        eyebrow: 'Founder note',
        heading: 'Explain the idea behind the page.',
        body: 'A text component gives founders space to describe process, values, materials, service details, or bilingual context.\n\nمكوّن النص يمنح المؤسسين مساحة لشرح خطوات العمل، القيم، المواد، تفاصيل الخدمة، أو السياق الثنائي اللغة.',
        emphasis: 'plain',
      };
    case 'image':
      return {
        imageUrl: DETAIL_IMAGE,
        alt: 'Product detail',
        caption: 'Single-image components are ideal for product detail, proof, or process.',
        aspect: '4/5',
        width: 'wide',
      };
    case 'gallery':
      return {
        columns: 4,
        aspect: '4/5',
        items: [BANNER_IMAGE, DETAIL_IMAGE, ALT_IMAGE, WORK_IMAGE].map((imageUrl, index) => ({
          imageUrl,
          alt: `Gallery item ${index + 1}`,
          caption: index === 0 ? 'Collection view' : '',
        })),
      };
    case 'productGrid':
      return { layout: 'cards', columns: 3, limit: 6, showInquire: true };
    case 'productList':
      return { groupByCategory: true, showImages: true, showPrices: true, limit: 6 };
    case 'featuredProduct':
      return { layout: 'split' };
    case 'productCardStack':
      return { backCards: 2, eyebrow: 'Featured pick', ctaLabel: 'View product' };
    case 'productPromoCard':
      return {
        tags: [
          { id: 'new', label: 'NEW' },
          { id: 'local', label: 'LOCAL' },
        ],
        tagPosition: 'top-end',
        tagReveal: 'always',
        showAddToCart: true,
        intensity: 'medium',
        width: 'wide',
      };
    case 'serviceList':
      return {
        heading: 'Services / الخدمات',
        showInquire: false,
        items: [
          {
            id: 'consultation',
            title: 'Launch consultation',
            description: 'A focused planning session for catalogue, copy, and launch order.',
            priceQar: 240,
            status: 'active',
          },
          {
            id: 'setup',
            title: 'Store setup',
            description: 'A done-with-you setup package for products, pages, and policies.',
            priceQar: 680,
            status: 'active',
          },
        ],
      };
    case 'menu':
      return {
        heading: 'Menu / القائمة',
        items: [
          {
            id: 'signature',
            title: 'Signature plate',
            titleAlt: 'طبق مميز',
            description: 'A bilingual row with description and price.',
            category: 'Mains',
            priceQar: 48,
            status: 'active',
          },
          {
            id: 'seasonal',
            title: 'Seasonal set',
            titleAlt: 'مجموعة موسمية',
            description: 'Useful for cafes, kitchens, services, and bundles.',
            category: 'Sets',
            priceQar: 120,
            status: 'active',
          },
        ],
      };
    case 'calendar':
      return {
        heading: 'Upcoming sessions / المواعيد القادمة',
        slots: [
          {
            id: 'slot-1',
            date: futureDate(8),
            time: '10:00',
            label: 'Founder workshop',
            capacity: 12,
            status: 'open',
          },
          {
            id: 'slot-2',
            date: futureDate(14),
            time: '17:30',
            label: 'Pop-up preview',
            capacity: 4,
            status: 'limited',
          },
        ],
      };
    case 'drop':
      return {
        dropId: COMPONENT_SHOWCASE_DROP_ID,
        heading: 'Timed drop / إصدار مؤقت',
        subheading: 'Use Drop Manager for launches, sell-outs, and waitlists.',
      };
    case 'contactCard':
      return {
        label: 'Contact / التواصل',
        heading: 'Keep the next step practical.',
        body: 'Show phone, area, working hours, Instagram, and other storefront profile details.',
        showPhone: true,
        showArea: true,
        showHours: true,
        showInstagram: true,
        phone: '+974 0000 0000',
        area: 'Doha / الدوحة',
        hours: 'Sat-Thu, 10:00-20:00',
        instagram: '@souqna.qa',
      };
    case 'inquireCta':
      return {
        eyebrow: 'Action / إجراء',
        title: 'Turn interest into a message.',
        body: 'A focused CTA can point buyers toward WhatsApp, booking, custom orders, or quote requests.',
        label: 'Send inquiry',
        variant: 'primary',
        align: 'center',
      };
    case 'spacer':
      return { size: 'lg' };
    case 'divider':
      return { glyph: true, width: 'wide' };
    case 'animatedText':
      return {
        eyebrow: 'Motion copy',
        text: 'Launch with motion. انطلق بحركة.',
        effect: 'wave',
        loop: true,
        speed: 'medium',
        align: 'center',
        emphasis: 'display',
      };
    case 'animatedImage':
      return {
        imageUrl: ALT_IMAGE,
        alt: 'Animated editorial image',
        caption: 'Motion treatments include parallax, magnetic, ken-burns, and tilt.',
        effect: 'kenburns',
        intensity: 'medium',
        aspect: '16/9',
        width: 'wide',
      };
    case 'tiltImage':
      return {
        imageUrl: WORK_IMAGE,
        alt: 'Tilt card image',
        title: 'Hover image',
        subtitle: 'A tactile card for campaign visuals and hero objects.',
        scrim: 'soft',
        tiltDirection: 'right',
        intensity: 'medium',
        aspect: '16/9',
        width: 'wide',
        cta: { label: 'View story', href: '/products' },
      };
    case 'spotlightCard':
      return {
        eyebrow: 'Announcement',
        title: 'A card for a moment worth noticing.',
        body: 'Use spotlight cards for events, drops, press notes, or compact editorial calls.',
        showDate: true,
        dateMonth: 'JUN',
        dateDay: '15',
        pattern: 'stripes',
        tiltDirection: 'right',
        intensity: 'medium',
        width: 'wide',
        cta: { label: 'Read more', href: '/products' },
      };
    case 'mawid':
      return {
        eventId: COMPONENT_SHOWCASE_EVENT_ID,
        startsAt: futureIso(2),
        variant: 'banner',
        heading: 'Countdown launch / إطلاق بعداد',
        subheading: 'Mawid adds a timed moment to a product, event, or campaign.',
      };
    case 'taqim':
      return {
        bundleId: COMPONENT_SHOWCASE_BUNDLE_ID,
        variant: 'cards',
        heading: 'Bundle offer / عرض باقة',
      };
    case 'depthShowcase':
      return {
        imageUrl: CERAMIC_IMAGE,
        title: 'Depth highlight',
        description: 'A parallax card for one premium product, collection, or founder story.',
        imageAlt: 'Ceramic object',
        width: 'wide',
      };
    case 'auroraRibbon':
      return {
        eyebrow: 'Premium surface',
        title: 'A short animated ribbon between content.',
        subtitle: 'Use it as a visual pause, not as the whole page.',
        heightPx: 220,
        brightness: 0.9,
      };
    case 'curvedLoop':
      return {
        marqueeText: 'Add Text Here',
        speed: 1.55,
        curveAmount: 360,
        direction: 'left',
        interactive: true,
        size: 'standard',
        tone: 'accent',
      };
    case 'showcase1':
      return createShowcase1Props();
    case 'showcase2':
      return createShowcase2Props();
    case 'showcase3':
      return createShowcase3Props();
    case 'showcase4':
      return createShowcase4Props();
    case 'showcase5':
      return createShowcase5Props();
    case 'ecommerce1':
    case 'ecommerce2':
    case 'ecommerce3':
    case 'ecommerce4':
    case 'ecommerce5':
    case 'ecommerce6':
    case 'ecommerce7':
      return createEcommerceProps(type);
    case 'shadcnNavbar':
    case 'shadcnHero':
    case 'shadcnTrustStrip':
    case 'shadcnCategories':
    case 'shadcnProductCard':
    case 'shadcnProductList':
    case 'shadcnProductDetail':
    case 'shadcnQuickView':
    case 'shadcnReviews':
    case 'shadcnOrderSummary':
    case 'shadcnOfferModal':
    case 'shadcnFooter':
      return createShadcnShowcaseProps(type);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function createShowcase1Props(): Showcase1Props {
  return {
    eyebrow: 'Featured paths',
    title: 'Choose a story and let the image carry the next step.',
    description: 'A compact switcher for launches, gift guides, services, and founder notes.',
    items: [
      {
        id: 'launch',
        title: 'Launch edit',
        subtitle: 'A short visual story for new arrivals.',
        kicker: 'Products',
        imageUrl: DETAIL_IMAGE,
        href: '/products',
      },
      {
        id: 'gift',
        title: 'Gift guide',
        subtitle: 'Group hero picks into one buying moment.',
        kicker: 'Gifting',
        imageUrl: ALT_IMAGE,
        href: '/products',
      },
      {
        id: 'studio',
        title: 'Studio notes',
        subtitle: 'Show process and founder context.',
        kicker: 'Editorial',
        imageUrl: WORK_IMAGE,
        href: '/products',
      },
    ],
  };
}

function createShowcase2Props(): Showcase2Props {
  return {
    eyebrow: 'Featured Work',
    title: 'A draggable rail for visual browsing.',
    cta: { label: 'View projects', href: '/products' },
    items: [
      { id: 'one', imageUrl: DETAIL_IMAGE, alt: 'Product visual', height: 'md' },
      { id: 'two', imageUrl: ALT_IMAGE, alt: 'Campaign visual', height: 'lg' },
      { id: 'three', imageUrl: WORK_IMAGE, alt: 'Brand case study', height: 'md' },
      { id: 'four', imageUrl: STUDIO_IMAGE, alt: 'Portfolio card', height: 'sm' },
    ],
  };
}

function createShowcase3Props(): Showcase3Props {
  return {
    title: 'Case studies',
    subtitle: 'A 3D carousel for a small set of stories.',
    items: [
      { id: 'one', title: 'Local launch', category: 'Commerce', imageUrl: DETAIL_IMAGE },
      { id: 'two', title: 'Seasonal edit', category: 'Campaign', imageUrl: ALT_IMAGE },
      { id: 'three', title: 'Studio system', category: 'Operations', imageUrl: WORK_IMAGE },
    ],
  };
}

function createShowcase4Props(): Showcase4Props {
  return {
    eyebrow: 'Selected work / 2026',
    title: 'Filter stories by category, use case, or collection.',
    projects: [
      {
        id: 'identity',
        title: 'Founder identity kit',
        client: 'Souqna Studio',
        year: '2026',
        tags: ['Identity'],
        imageUrl: WORK_IMAGE,
        href: '/products',
      },
      {
        id: 'coffee',
        title: 'Coffee launch',
        client: 'Doha Roast',
        year: '2026',
        tags: ['Campaign'],
        imageUrl: COFFEE_IMAGE,
        href: '/products',
      },
      {
        id: 'market',
        title: 'Market weekend',
        client: 'Local Makers',
        year: '2026',
        tags: ['Events'],
        imageUrl: MARKET_IMAGE,
        href: '/products',
      },
    ],
  };
}

function createShowcase5Props(): Showcase5Props {
  return {
    eyebrow: 'In the wild',
    title: 'Tabs split one visual story into named groups.',
    description: 'Use tabs for teams, categories, creators, edits, or seasonal chapters.',
    tabs: [
      { id: 'studios', label: 'Studios', images: [WORK_IMAGE, STUDIO_IMAGE, DETAIL_IMAGE] },
      { id: 'creators', label: 'Creators', images: [ALT_IMAGE, CATEGORY_IMAGE, CERAMIC_IMAGE] },
      { id: 'events', label: 'Events', images: [MARKET_IMAGE, COFFEE_IMAGE, BANNER_IMAGE] },
    ],
  };
}

function createEcommerceProps(type: BlockType): EcommerceBlockProps {
  const products = defaultEcommerceProducts();
  return {
    eyebrow: 'Commerce / التجارة',
    title: ecommerceTitle(type),
    subtitle: 'A self-contained ecommerce section with bilingual-ready product structure.',
    cta: { label: 'Shop the edit', href: '/products' },
    products,
    categories: [
      { id: 'travel', label: 'Travel', tag: 'Essentials', imageUrl: DETAIL_IMAGE, href: '/products' },
      { id: 'home', label: 'Home', tag: 'Objects', imageUrl: CERAMIC_IMAGE, href: '/products' },
      { id: 'gifts', label: 'Gifts', tag: 'Curated', imageUrl: CATEGORY_IMAGE, href: '/products' },
    ],
    tabs: ['All', 'Travel', 'Home', 'Gifts'],
  };
}

function ecommerceTitle(type: BlockType): string {
  switch (type) {
    case 'ecommerce1':
      return 'Product gallery with sizes and details';
    case 'ecommerce2':
      return 'Filterable shop surface';
    case 'ecommerce3':
      return 'Color-led product detail';
    case 'ecommerce4':
      return 'Limited drop product';
    case 'ecommerce5':
      return 'Editorial product shelf';
    case 'ecommerce6':
      return 'Category shop with tabs';
    case 'ecommerce7':
      return 'Visual category tiles';
    default:
      return 'Commerce component';
  }
}

function createShadcnShowcaseProps(type: BlockType): Record<string, unknown> {
  const base = createEcommerceProps('ecommerce5');
  const variantByType: Partial<Record<BlockType, string>> = {
    shadcnNavbar: 'ecommerce-navbar2',
    shadcnHero: 'ecommerce-hero6',
    shadcnTrustStrip: 'trust-strip3',
    shadcnCategories: 'product-categories4',
    shadcnProductCard: 'product-card24',
    shadcnProductList: 'product-list6',
    shadcnProductDetail: 'product-detail9',
    shadcnQuickView: 'product-quick-view8',
    shadcnReviews: 'reviews23',
    shadcnOrderSummary: 'order-summary2',
    shadcnOfferModal: 'offer-modal5',
    shadcnFooter: 'ecommerce-footer18',
  };
  const titleByType: Partial<Record<BlockType, string>> = {
    shadcnNavbar: 'Premium route-aware navbar',
    shadcnHero: 'Premium ecommerce hero',
    shadcnTrustStrip: 'Trust proof strip',
    shadcnCategories: 'Premium product categories',
    shadcnProductCard: 'Premium product cards',
    shadcnProductList: 'Premium product list',
    shadcnProductDetail: 'Premium product detail',
    shadcnQuickView: 'Product quick view',
    shadcnReviews: 'Premium review cards',
    shadcnOrderSummary: 'Checkout summary preview',
    shadcnOfferModal: 'Controlled offer module',
    shadcnFooter: 'Premium commerce footer',
  };
  const props: Record<string, unknown> = {
    ...base,
    variant: variantByType[type],
    kicker: 'Souqna Pro+',
    title: titleByType[type],
    subtitle:
      'Paid commerce components optimized for Souqna routing, bilingual text, live products, cart actions, and mobile layouts.',
    density: 'balanced',
    tone: type === 'shadcnHero' ? 'charcoal' : 'sand',
  };
  if (type === 'shadcnNavbar') {
    props.sticky = false;
    props.announcement = 'Secure checkout and local delivery';
    props.ctaLabel = 'Shop products';
    props.ctaHref = '/products';
    props.showSearch = true;
    props.showPolicyLinks = true;
    props.cartLabel = 'Cart';
  }
  if (type === 'shadcnFooter') props.showNewsletter = true;
  if (type === 'shadcnTrustStrip') {
    props.metrics = [
      { value: '974', labelEn: 'Qatar ready', labelAr: 'جاهز لقطر', icon: 'shield' },
      { value: 'COD', labelEn: 'Cash and card', labelAr: 'نقدي وبطاقة', icon: 'card' },
      { value: 'Fast', labelEn: 'Delivery notes', labelAr: 'ملاحظات التوصيل', icon: 'truck' },
    ];
  }
  if (type === 'shadcnProductDetail' || type === 'shadcnQuickView') {
    props.productId = base.products?.[0]?.id;
  }
  if (type === 'shadcnReviews') {
    props.reviews = [
      {
        nameEn: 'Aisha',
        nameAr: 'عائشة',
        quoteEn: 'The product page felt clear, fast, and premium.',
        quoteAr: 'صفحة المنتج كانت واضحة وسريعة ومميزة.',
        rating: 5,
      },
      {
        nameEn: 'Noora',
        nameAr: 'نورة',
        quoteEn: 'The checkout flow made the store feel trustworthy.',
        quoteAr: 'خطوات الدفع جعلت المتجر يبدو موثوقاً.',
        rating: 5,
      },
    ];
  }
  if (type === 'shadcnOfferModal') {
    props.discountLabel = 'Launch edit';
    props.delayMs = 1000;
  }
  return props;
}

function defaultEcommerceProducts(): EcommerceProduct[] {
  return [
    {
      id: 'linen-set',
      name: 'Linen travel set',
      brand: 'Souqna Studio',
      category: 'Travel',
      price: 'QAR 240',
      priceQar: 240,
      tag: 'New',
      imageUrl: DETAIL_IMAGE,
      images: [DETAIL_IMAGE, ALT_IMAGE],
      description: 'A compact edit for errands, travel days, and giftable bundles.',
      details: ['Ships from Qatar', 'Gift wrap available', 'Bilingual product copy'],
      colors: [
        { name: 'Oat', value: '#d9c7a7' },
        { name: 'Ink', value: '#202020' },
        { name: 'Palm', value: '#55715f' },
      ],
      sizes: [
        { label: 'S', available: true },
        { label: 'M', available: true },
        { label: 'L', available: true },
      ],
      href: '/products',
      available: true,
      status: 'active',
    },
    {
      id: 'ceramic-pair',
      name: 'Ceramic cup pair',
      brand: 'Dohat Clay',
      category: 'Home',
      price: 'QAR 180',
      priceQar: 180,
      tag: 'Local',
      imageUrl: CERAMIC_IMAGE,
      images: [CERAMIC_IMAGE, COFFEE_IMAGE],
      description: 'A handmade pair for daily rituals and gifting.',
      details: ['Handmade finish', 'Limited batch', 'Pickup or delivery'],
      colors: [
        { name: 'Clay', value: '#a66d4f' },
        { name: 'Cream', value: '#eadcc4' },
      ],
      sizes: [{ label: 'Pair', available: true }],
      href: '/products',
      available: true,
      status: 'active',
    },
    {
      id: 'market-bundle',
      name: 'Market weekend bundle',
      brand: 'Local Makers',
      category: 'Gifts',
      price: 'QAR 320',
      priceQar: 320,
      tag: 'Bundle',
      imageUrl: MARKET_IMAGE,
      images: [MARKET_IMAGE, CATEGORY_IMAGE],
      description: 'A small bundle for pop-ups, thank-you gifts, and seasonal shelves.',
      details: ['Curated set', 'Custom notes available', 'Limited quantity'],
      sizes: [{ label: 'One size', available: true }],
      href: '/products',
      available: true,
      status: 'active',
    },
  ];
}

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function futureDate(daysFromNow: number): string {
  return futureIso(daysFromNow).slice(0, 10);
}
