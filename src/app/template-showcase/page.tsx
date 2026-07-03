import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType, CSSProperties } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Crown,
  Globe2,
  LayoutGrid,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Zap,
} from 'lucide-react';
import { EcommerceFooter1 } from '@/components/ecommerce-footer1';
import { EcommerceFooter18 } from '@/components/ecommerce-footer18';
import { EcommerceFooter2 } from '@/components/ecommerce-footer2';
import { EcommerceHero1 } from '@/components/ecommerce-hero1';
import { EcommerceHero3 } from '@/components/ecommerce-hero3';
import { EcommerceHero6 } from '@/components/ecommerce-hero6';
import { EcommerceNavbar2 } from '@/components/ecommerce-navbar2';
import { ProductCard10 } from '@/components/product-card10';
import { ProductCard24 } from '@/components/product-card24';
import { ProductCategories2 } from '@/components/product-categories2';
import { ProductCategories4 } from '@/components/product-categories4';
import { ProductCategories5 } from '@/components/product-categories5';
import { ProductDetail2 } from '@/components/product-detail2';
import { ProductDetail3 } from '@/components/product-detail3';
import { ProductDetail4 } from '@/components/product-detail4';
import { ProductDetail6 } from '@/components/product-detail6';
import { ProductDetail9 } from '@/components/product-detail9';
import { ProductList2 } from '@/components/product-list2';
import { ProductList3 } from '@/components/product-list3';
import { ProductList4 } from '@/components/product-list4';
import { ProductList5 } from '@/components/product-list5';
import { ProductList6 } from '@/components/product-list6';
import { ProductList7 } from '@/components/product-list7';
import { Reviews2 } from '@/components/reviews2';
import { Reviews23 } from '@/components/reviews23';
import { Reviews9 } from '@/components/reviews9';
import { OrderSummary1 } from '@/components/order-summary1';
import { OrderSummary2 } from '@/components/order-summary2';
import { TrustStrip1 } from '@/components/trust-strip1';
import { TrustStrip3 } from '@/components/trust-strip3';
import { PortalPreviewLauncher } from '@/components/template-showcase/PortalPreviewLauncher';
import { SouqnaWiredCommerceShowcase } from '@/components/template-showcase/SouqnaWiredCommerceShowcase';
import { BACKGROUND_PATTERNS } from '@/lib/blocks/backgroundPatterns';

export const metadata: Metadata = {
  title: 'Pro+ and Max+ Template Showcase | Souqna',
  description:
    'A one-page Souqna showcase for advertising Pro+ and Max+ storefront templates with sample products.',
};

type SampleProduct = {
  name: string;
  nameAr: string;
  price: string;
  tag: string;
  image: string;
};

const proHeroProduct: SampleProduct = {
  name: 'Amber Launch Set',
  nameAr: 'طقم إطلاق العنبر',
  price: 'QAR 280',
  tag: 'New',
  image: '/seed-products/vitrine/1.svg',
};

const maxHeroProduct: SampleProduct = {
  name: 'Oud Signature Box',
  nameAr: 'صندوق العود الفاخر',
  price: 'QAR 520',
  tag: 'Max+',
  image: '/seed-products/atrium/1.svg',
};

const proProducts: SampleProduct[] = [
  proHeroProduct,
  {
    name: 'Identity Kit',
    nameAr: 'هوية المتجر',
    price: 'QAR 340',
    tag: 'Featured',
    image: '/seed-products/launchpad/2.svg',
  },
  {
    name: 'Gift Capsule',
    nameAr: 'كبسولة الهدايا',
    price: 'QAR 190',
    tag: 'Bundle',
    image: '/seed-products/bazaar/3.svg',
  },
];

const maxProducts: SampleProduct[] = [
  maxHeroProduct,
  {
    name: 'Majlis Editorial Set',
    nameAr: 'مجموعة المجلس',
    price: 'QAR 680',
    tag: 'VIP',
    image: '/seed-products/studio/4.svg',
  },
  {
    name: 'Gold Detail Pack',
    nameAr: 'حزمة التفاصيل الذهبية',
    price: 'QAR 420',
    tag: 'Limited',
    image: '/seed-products/lounge/5.svg',
  },
];

const modules = [
  { label: 'Hero storefronts', labelAr: 'واجهات رئيسية', icon: Sparkles },
  { label: 'Premium product cards', labelAr: 'بطاقات منتجات فاخرة', icon: ShoppingBag },
  { label: 'Product detail pages', labelAr: 'صفحات المنتج', icon: LayoutGrid },
  { label: 'Reviews and trust', labelAr: 'التقييمات والثقة', icon: ShieldCheck },
  { label: 'Order summaries', labelAr: 'ملخصات الطلب', icon: PackageCheck },
  { label: 'Bilingual routing', labelAr: 'روابط ثنائية اللغة', icon: Globe2 },
];

type LooseBlock = ComponentType<Record<string, unknown>>;

type ActualPreview = {
  id: string;
  title: string;
  titleAr: string;
  summary: string;
  Component: LooseBlock;
  props?: Record<string, unknown>;
  size?: 'wide' | 'half' | 'compact';
  dark?: boolean;
};

type ActualPreviewGroup = {
  title: string;
  titleAr: string;
  summary: string;
  previews: ActualPreview[];
};

const asBlock = (component: unknown) => component as LooseBlock;

const sampleHeroProducts = [
  {
    image: '/seed-products/vitrine/1.svg',
    name: 'Oud & Amber Launch',
    href: '/template-showcase/products/oud-amber-launch',
    collection: 'Product Suite',
    price: { regular: 280, sale: 240, currency: 'QAR' },
  },
  {
    image: '/seed-products/launchpad/2.svg',
    name: 'Souqna Identity Kit',
    href: '/template-showcase/products/identity-kit',
    collection: 'Brand kit',
    price: { regular: 340, currency: 'QAR' },
  },
  {
    image: '/seed-products/bazaar/3.svg',
    name: 'Gift Capsule Pack',
    href: '/template-showcase/products/gift-capsule',
    collection: 'Gift sets',
    price: { regular: 190, currency: 'QAR' },
  },
  {
    image: '/seed-products/atrium/1.svg',
    name: 'Signature Oud Box',
    href: '/template-showcase/products/signature-oud-box',
    collection: 'Max+ drop',
    price: { regular: 520, currency: 'QAR' },
  },
];

const sampleHeroCarousel = [
  [
    {
      image: '/seed-products/vitrine/1.svg',
      title: 'Product Suite Launch',
      product: {
        name: 'Oud & Amber Launch Set',
        description: 'Premium product cards for launch-ready storefronts',
        image: '/seed-products/vitrine/2.svg',
        link: '/template-showcase/products/oud-amber-launch',
        price: { regular: 280, currency: 'QAR' },
      },
    },
    {
      image: '/seed-products/launchpad/3.svg',
      title: 'Bilingual Commerce',
      product: {
        name: 'Souqna Identity Kit',
        description: 'Arabic and English storefront sections',
        image: '/seed-products/launchpad/4.svg',
        link: '/template-showcase/products/identity-kit',
        price: { regular: 340, currency: 'QAR' },
      },
    },
  ],
  [
    {
      image: '/seed-products/bazaar/4.svg',
      title: 'Campaign Collections',
      product: {
        name: 'Gift Capsule Pack',
        description: 'Editorial product moments for seasonal offers',
        image: '/seed-products/bazaar/5.svg',
        link: '/template-showcase/products/gift-capsule',
        price: { regular: 190, currency: 'QAR' },
      },
    },
    {
      image: '/seed-products/atrium/2.svg',
      title: 'Max+ Storytelling',
      product: {
        name: 'Signature Oud Box',
        description: 'Luxury PDP-style product sections',
        image: '/seed-products/atrium/3.svg',
        link: '/template-showcase/products/signature-oud-box',
        price: { regular: 520, currency: 'QAR' },
      },
    },
  ],
];

const sampleCategories = [
  {
    title: 'Launch sets',
    summary: 'Ready-to-sell product bundles',
    image: { src: '/seed-products/vitrine/3.svg', alt: 'Launch set' },
    link: '/template-showcase/products?category=launch',
  },
  {
    title: 'Identity kits',
    summary: 'Brand visuals and collection assets',
    image: { src: '/seed-products/launchpad/1.svg', alt: 'Identity kit' },
    link: '/template-showcase/products?category=brand',
  },
  {
    title: 'Gift capsules',
    summary: 'Campaign-ready seasonal products',
    image: { src: '/seed-products/bazaar/2.svg', alt: 'Gift capsule' },
    link: '/template-showcase/products?category=gifts',
  },
  {
    title: 'Signature drops',
    summary: 'Max+ editorial product stories',
    image: { src: '/seed-products/atrium/4.svg', alt: 'Signature drop' },
    link: '/template-showcase/products?category=max',
  },
  {
    title: 'Checkout confidence',
    summary: 'Trust, delivery, and payment cues',
    image: { src: '/seed-products/studio/3.svg', alt: 'Checkout confidence' },
    link: '/template-showcase/products?category=checkout',
  },
  {
    title: 'Review moments',
    summary: 'Social proof for premium stores',
    image: { src: '/seed-products/lounge/2.svg', alt: 'Review moments' },
    link: '/template-showcase/products?category=reviews',
  },
];

const sampleTrustItems = [
  { icon: <ShieldCheck className="size-5" />, title: 'Secure checkout', description: 'Card, Apple Pay, Fawran, or cash' },
  { icon: <ShoppingBag className="size-5" />, title: 'Live catalogue', description: 'Products and categories connected' },
  { icon: <Globe2 className="size-5" />, title: 'Arabic + English', description: 'RTL-safe storefront sections' },
  { icon: <Star className="size-5" />, title: 'Premium templates', description: 'Pro+ and Max+ commerce blocks' },
];

const sampleReviews = [
  {
    author: { name: 'Maha A.', verifiedBuyer: true },
    comment: 'The store felt premium immediately. Products, delivery notes, and checkout were all clear.',
    image: '/seed-products/vitrine/4.svg',
    product: {
      name: 'Oud & Amber Launch Set',
      image: '/seed-products/vitrine/1.svg',
      link: '/template-showcase/products/oud-amber-launch',
    },
  },
  {
    author: { name: 'Nasser K.', verifiedBuyer: true },
    comment: 'The Max+ product sections made the campaign page look like a real brand launch.',
    image: '/seed-products/atrium/5.svg',
    product: {
      name: 'Signature Oud Box',
      image: '/seed-products/atrium/1.svg',
      link: '/template-showcase/products/signature-oud-box',
    },
  },
  {
    author: { name: 'Sara M.', verifiedBuyer: true },
    comment: 'The checkout summary and trust badges helped customers understand the order before paying.',
    image: '/seed-products/bazaar/1.svg',
    product: {
      name: 'Gift Capsule Pack',
      image: '/seed-products/bazaar/3.svg',
      link: '/template-showcase/products/gift-capsule',
    },
  },
];

const sampleOrder = {
  orderNumber: 'SQN-1048',
  orderDate: 'June 25, 2026',
  status: 'confirmed',
  email: 'buyer@example.com',
  items: [
    {
      id: '1',
      name: 'Oud & Amber Launch Set',
      image: '/seed-products/vitrine/1.svg',
      price: 280,
      quantity: 1,
      details: [{ label: 'Template', value: 'Pro+' }],
    },
    {
      id: '2',
      name: 'Signature Oud Box',
      image: '/seed-products/atrium/1.svg',
      price: 520,
      quantity: 1,
      details: [{ label: 'Template', value: 'Max+' }],
    },
  ],
  subtotal: 800,
  shipping: 20,
  tax: 0,
  discount: 80,
  total: 740,
  shippingAddress: {
    name: 'Souqna Buyer',
    street: 'House 12, Zone 38, Street 856',
    city: 'Doha',
    state: 'Doha',
    zipCode: '00000',
    country: 'Qatar',
  },
  shippingMethod: 'Local delivery',
  estimatedDelivery: 'Today',
  paymentMethod: { type: 'card', lastFour: '2048', cardBrand: 'Visa' },
};

const actualPreviewGroups: ActualPreviewGroup[] = [
  {
    title: 'Navigation and hero blocks',
    titleAr: 'التنقل والواجهة الرئيسية',
    summary: 'Actual storefront nav and hero components rendered with Souqna sample products.',
    previews: [
      {
        id: 'navbar',
        title: 'ecommerce-navbar2',
        titleAr: 'تنقل متجر',
        summary: 'Mega menu, search, account, wishlist, and cart actions.',
        Component: asBlock(EcommerceNavbar2),
        props: { className: 'showcase-contained-navbar' },
        size: 'wide',
      },
      {
        id: 'hero1',
        title: 'ecommerce-hero1',
        titleAr: 'واجهة كاروسيل',
        summary: 'Two-column product story carousel.',
        Component: asBlock(EcommerceHero1),
        props: { carouselItems: sampleHeroCarousel },
        size: 'wide',
      },
      {
        id: 'hero3',
        title: 'ecommerce-hero3',
        titleAr: 'واجهة مع منتجات',
        summary: 'Background hero with product carousel.',
        Component: asBlock(EcommerceHero3),
        props: {
          backgroundImage: '/seed-products/studio/1.svg',
          title: 'Premium product drops for Souqna stores',
          subtitle: 'Pro+ Product Suite',
          description: 'A polished storefront spine for product discovery, trust, and checkout confidence.',
          cta: { label: 'View products', href: '/template-showcase/products' },
          products: sampleHeroProducts,
        },
        size: 'wide',
      },
      {
        id: 'hero6',
        title: 'ecommerce-hero6',
        titleAr: 'واجهة Max+',
        summary: 'Large editorial hero with vertical product rail.',
        Component: asBlock(EcommerceHero6),
        props: {
          title: 'Max+ editorial commerce for premium storefronts',
          image: '/seed-products/atrium/2.svg',
          cta: { label: 'Explore Max+', href: '/pricing-preview' },
          products: sampleHeroProducts,
        },
        size: 'wide',
        dark: true,
      },
    ],
  },
  {
    title: 'Trust and category blocks',
    titleAr: 'الثقة والفئات',
    summary: 'Trust strips and category modules rendered as storefront-ready sections.',
    previews: [
      {
        id: 'trust1',
        title: 'trust-strip1',
        titleAr: 'شريط ثقة',
        summary: 'Four service promises for checkout confidence.',
        Component: asBlock(TrustStrip1),
        props: { items: sampleTrustItems },
        size: 'half',
      },
      {
        id: 'trust3',
        title: 'trust-strip3',
        titleAr: 'شهادات وثقة',
        summary: 'Payment and service guarantees.',
        Component: asBlock(TrustStrip3),
        props: {
          guarantees: ['Secure checkout', 'WhatsApp support', 'Local Qatar delivery'],
        },
        size: 'half',
      },
      {
        id: 'categories2',
        title: 'product-categories2',
        titleAr: 'فئات المنتجات',
        summary: 'Grid category browsing with product imagery.',
        Component: asBlock(ProductCategories2),
        props: { title: 'Shop by Souqna suite', productCategories: sampleCategories },
        size: 'wide',
      },
      {
        id: 'categories4',
        title: 'product-categories4',
        titleAr: 'فئة تحريرية',
        summary: 'Editorial category landing section.',
        Component: asBlock(ProductCategories4),
        size: 'half',
      },
      {
        id: 'categories5',
        title: 'product-categories5',
        titleAr: 'فئات مصورة',
        summary: 'Promotional category split layout.',
        Component: asBlock(ProductCategories5),
        size: 'half',
      },
    ],
  },
  {
    title: 'Product cards and lists',
    titleAr: 'بطاقات وقوائم المنتجات',
    summary: 'The actual card and catalogue-list components installed for Pro+ and Max+ templates.',
    previews: [
      { id: 'card10', title: 'product-card10', titleAr: 'بطاقة منتج', summary: 'Variant-aware card.', Component: asBlock(ProductCard10), size: 'compact' },
      { id: 'card24', title: 'product-card24', titleAr: 'بطاقة فاخرة', summary: 'Premium quick-add card.', Component: asBlock(ProductCard24), size: 'compact' },
      { id: 'list2', title: 'product-list2', titleAr: 'قائمة 2', summary: 'Responsive product grid.', Component: asBlock(ProductList2), size: 'wide' },
      { id: 'list3', title: 'product-list3', titleAr: 'قائمة 3', summary: 'Alternate grid card layout.', Component: asBlock(ProductList3), size: 'wide' },
      { id: 'list4', title: 'product-list4', titleAr: 'قائمة 4', summary: 'Promo card plus product grid.', Component: asBlock(ProductList4), size: 'wide' },
      { id: 'list5', title: 'product-list5', titleAr: 'قائمة 5', summary: 'Editorial product listing.', Component: asBlock(ProductList5), size: 'wide' },
      { id: 'list6', title: 'product-list6', titleAr: 'قائمة 6', summary: 'Carousel product list.', Component: asBlock(ProductList6), size: 'wide' },
      { id: 'list7', title: 'product-list7', titleAr: 'قائمة 7', summary: 'Recommendation grid with quick options.', Component: asBlock(ProductList7), size: 'wide' },
    ],
  },
  {
    title: 'Product detail pages',
    titleAr: 'صفحات تفاصيل المنتج',
    summary: 'PDP-style blocks for Max+ product storytelling and premium buying flows.',
    previews: [
      { id: 'detail2', title: 'product-detail2', titleAr: 'تفاصيل 2', summary: 'Gallery, sticky purchase panel, accordions.', Component: asBlock(ProductDetail2), size: 'wide' },
      { id: 'detail3', title: 'product-detail3', titleAr: 'تفاصيل 3', summary: 'Split product detail layout.', Component: asBlock(ProductDetail3), size: 'wide' },
      { id: 'detail4', title: 'product-detail4', titleAr: 'تفاصيل 4', summary: 'Muted editorial product detail.', Component: asBlock(ProductDetail4), size: 'wide' },
      { id: 'detail6', title: 'product-detail6', titleAr: 'تفاصيل 6', summary: 'Recommendation-aware PDP layout.', Component: asBlock(ProductDetail6), size: 'wide' },
      { id: 'detail9', title: 'product-detail9', titleAr: 'تفاصيل 9', summary: 'High-contrast Max+ PDP section.', Component: asBlock(ProductDetail9), size: 'wide', dark: true },
    ],
  },
  {
    title: 'Reviews, order summaries, and footers',
    titleAr: 'التقييمات وملخص الطلب والتذييل',
    summary: 'Social proof, thank-you/order confidence, and complete footer systems.',
    previews: [
      { id: 'reviews2', title: 'reviews2', titleAr: 'تقييمات 2', summary: 'Review summary and cards.', Component: asBlock(Reviews2), size: 'wide' },
      { id: 'reviews9', title: 'reviews9', titleAr: 'تقييمات 9', summary: 'Carousel review section.', Component: asBlock(Reviews9), size: 'wide' },
      { id: 'reviews23', title: 'reviews23', titleAr: 'تقييمات 23', summary: 'Product-linked customer proof.', Component: asBlock(Reviews23), props: { reviews: sampleReviews }, size: 'wide' },
      { id: 'order1', title: 'order-summary1', titleAr: 'ملخص طلب 1', summary: 'Thank-you page order summary.', Component: asBlock(OrderSummary1), props: { order: sampleOrder }, size: 'wide' },
      { id: 'order2', title: 'order-summary2', titleAr: 'ملخص طلب 2', summary: 'Alternate order summary layout.', Component: asBlock(OrderSummary2), props: { order: sampleOrder }, size: 'wide' },
      { id: 'footer1', title: 'ecommerce-footer1', titleAr: 'تذييل 1', summary: 'Newsletter, policies, and contact links.', Component: asBlock(EcommerceFooter1), size: 'wide' },
      { id: 'footer2', title: 'ecommerce-footer2', titleAr: 'تذييل 2', summary: 'Accordion footer with social links.', Component: asBlock(EcommerceFooter2), size: 'wide' },
      { id: 'footer18', title: 'ecommerce-footer18', titleAr: 'تذييل 18', summary: 'Editorial footer with image and payments.', Component: asBlock(EcommerceFooter18), size: 'wide', dark: true },
    ],
  },
];

const recentAdditions = [
  {
    title: 'All Products system page',
    titleAr: 'صفحة كل المنتجات',
    summary: 'A non-deletable catalogue page with search, category filters, price controls, availability, sorting, and responsive mobile/tablet/desktop views.',
    detail: 'Can be turned on or off from Builder pages.',
    icon: Store,
  },
  {
    title: 'Editable checkout page',
    titleAr: 'صفحة دفع قابلة للتعديل',
    summary: 'Controlled Builder controls for hero text, address style, buttons, trust badges, delivery notes, payment cards, summary layout, and thank-you style.',
    detail: 'Checkout stays protected and cannot be turned off.',
    icon: ShieldCheck,
  },
  {
    title: 'Product Suite template blocks',
    titleAr: 'مكونات قالب المنتجات',
    summary: 'The premium shadcn commerce blocks are wired as separate bilingual components instead of hidden variants.',
    detail: 'ReactBits branding was removed from merchant-facing labels.',
    icon: LayoutGrid,
  },
  {
    title: 'Curved Loop text block',
    titleAr: 'نص دائري متحرك',
    summary: 'A motion block with “Add Text Here” default copy, optimized for mobile, tablet, and desktop showcase pages.',
    detail: 'Ready for Pro+ and Max+ template storytelling.',
    icon: Sparkles,
  },
];

const comparison = [
  {
    plan: 'Pro+',
    title: 'Premium selling layouts',
    titleAr: 'تصاميم بيع احترافية',
    points: ['High-converting product grids', 'Trust strips and review blocks', 'Polished checkout sections'],
  },
  {
    plan: 'Max+',
    title: 'Signature commerce direction',
    titleAr: 'تجربة تجارية فاخرة',
    points: ['Editorial product storytelling', 'VIP drops and campaign sections', 'Deeper analytics-ready modules'],
  },
];

function ProductCard({ product, elevated = false }: { product: SampleProduct; elevated?: boolean }) {
  return (
    <article
      className={`overflow-hidden rounded-lg border ${
        elevated
          ? 'border-[#d2aa58]/60 bg-[#1a1713] text-[#f8efdf] shadow-2xl shadow-black/30'
          : 'border-[#d9c3a3] bg-[#fbf4e7] shadow-xl shadow-[#8d6b3f]/10'
      }`}
    >
      <div className={`relative aspect-[4/3] ${elevated ? 'bg-[#261f17]' : 'bg-[#eadcc4]'}`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 768px) 33vw, 90vw"
          className="object-cover"
          unoptimized
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
            elevated ? 'bg-[#d8b464] text-[#1d1710]' : 'bg-[#7f2f3a] text-white'
          }`}
        >
          {product.tag}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-xl font-black leading-tight">{product.name}</h3>
          <p className={`mt-1 text-sm ${elevated ? 'text-[#d9caae]' : 'text-[#6f5c47]'}`} dir="rtl">
            {product.nameAr}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-black">{product.price}</span>
          <Link
            href="/pricing-preview"
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              elevated ? 'bg-[#d8b464] text-[#1d1710]' : 'bg-[#261f17] text-white'
            }`}
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

function PlanBadge({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
        dark
          ? 'border-[#d8b464]/40 bg-[#d8b464]/12 text-[#f3d58a]'
          : 'border-[#8c3540]/20 bg-[#8c3540]/10 text-[#8c3540]'
      }`}
    >
      <Crown className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function LiveComponentPreview({ preview }: { preview: ActualPreview }) {
  const Component = preview.Component;
  const isCompact = preview.size === 'compact';
  return (
    <article
      className={`rounded-lg border ${
        preview.dark
          ? 'border-[#d8b464]/35 bg-[#171411] text-[#f8efdf]'
          : 'border-[#d8c09a] bg-[#fff8ec] text-[#261f17]'
      } ${preview.size === 'wide' ? 'xl:col-span-2' : ''}`}
    >
      <div className="flex flex-col justify-between gap-3 border-b border-current/10 p-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black leading-tight">{preview.title}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                preview.dark ? 'bg-[#d8b464] text-[#1d1710]' : 'bg-[#efe0c6] text-[#7f2f3a]'
              }`}
            >
              live
            </span>
          </div>
          <p className={`mt-1 text-sm font-bold ${preview.dark ? 'text-[#d7c8ac]' : 'text-[#7a6348]'}`} dir="rtl">
            {preview.titleAr}
          </p>
        </div>
        <p className={`max-w-xl text-sm font-semibold leading-6 ${preview.dark ? 'text-[#d8c9aa]' : 'text-[#6a5740]'}`}>
          {preview.summary}
        </p>
      </div>
      <div
        className={`showcase-live-preview relative overflow-hidden ${
          preview.dark ? 'bg-[#0f0d0b]' : 'bg-[#f7ecd9]'
        } ${isCompact ? 'grid min-h-[520px] place-items-center p-5' : 'p-0'}`}
      >
        <Component {...(preview.props ?? {})} />
      </div>
    </article>
  );
}

function PatternPreviewGrid() {
  const patterns = BACKGROUND_PATTERNS.slice(0, 14);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {patterns.map((pattern) => (
        <article key={pattern.id} className="overflow-hidden rounded-lg border border-[#d8c09a] bg-[#fff8ec]">
          <div
            className="h-28"
            style={
              {
                '--sf-ground': '#f5ead6',
                '--sf-ink': '#261f17',
                '--sf-accent': '#8c3540',
                background: pattern.css,
                backgroundSize: pattern.size,
              } as CSSProperties
            }
          />
          <div className="flex items-center justify-between gap-3 p-3">
            <p className="text-sm font-black text-[#261f17]">{pattern.name}</p>
            <span className="rounded-full bg-[#efe0c6] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#7f2f3a]">
              {pattern.category}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function TemplateShowcasePage() {
  return (
    <main className="template-showcase-root min-h-dvh overflow-hidden bg-[#f5ead6] text-[#261f17]">
      <section className="relative border-b border-[#d7c19f] bg-[radial-gradient(circle_at_18%_12%,rgba(129,48,58,0.16),transparent_32%),radial-gradient(circle_at_86%_10%,rgba(214,173,93,0.28),transparent_30%),linear-gradient(135deg,#fbf3e4_0%,#ead7b7_52%,#f6ead7_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#261f17] text-sm font-black text-[#f4d386]">
              S
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.24em]">Souqna</span>
              <span className="block text-xs font-semibold text-[#77634b]">Template Showcase</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <PlanBadge>Pro+</PlanBadge>
            <PlanBadge>Max+</PlanBadge>
          </div>
          <Link
            href="/pricing-preview"
            className="inline-flex items-center gap-2 rounded-full bg-[#7f2f3a] px-4 py-2 text-sm font-black text-white shadow-lg shadow-[#7f2f3a]/20"
          >
            View plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:pb-20">
          <div className="max-w-3xl space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d2aa58]/50 bg-white/45 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#7f2f3a] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Paid template advertising page
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-[#261f17] sm:text-6xl lg:text-7xl">
                Pro+ and Max+ storefronts that look worth upgrading for.
              </h1>
              <p className="max-w-2xl text-lg font-semibold leading-8 text-[#6a5740]">
                Showcase premium Souqna templates with real commerce sections, bilingual product
                moments, richer checkout confidence, and sample products ready for ads.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/account/builder?store=templates"
                className="inline-flex items-center gap-2 rounded-full bg-[#261f17] px-5 py-3 text-sm font-black text-[#f8ead1] shadow-xl shadow-black/15"
              >
                Open templates
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/souqna"
                className="inline-flex items-center gap-2 rounded-full border border-[#b79258] bg-white/45 px-5 py-3 text-sm font-black text-[#5e4630]"
              >
                Explore live stores
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-10 hidden h-40 w-40 rounded-full border border-[#d2aa58]/40 lg:block" />
            <div className="relative grid gap-4 sm:grid-cols-2">
              <div className="space-y-4 rounded-lg border border-[#dec9a8] bg-white/52 p-4 shadow-2xl shadow-[#8d6b3f]/15 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <PlanBadge>Pro+</PlanBadge>
                  <span className="rounded-full bg-[#f2dfbd] px-3 py-1 text-xs font-black text-[#7f2f3a]">
                    Launch suite
                  </span>
                </div>
                <ProductCard product={proHeroProduct} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#261f17] p-4 text-[#f7ead3]">
                    <BarChart3 className="mb-5 h-5 w-5 text-[#d8b464]" />
                    <p className="text-2xl font-black">4.8%</p>
                    <p className="text-xs font-bold text-[#d7c8ac]">Conversion preview</p>
                  </div>
                  <div className="rounded-lg bg-[#8c3540] p-4 text-white">
                    <ShoppingBag className="mb-5 h-5 w-5 text-[#f4d386]" />
                    <p className="text-2xl font-black">12</p>
                    <p className="text-xs font-bold text-[#f4dccc]">Sample orders</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-4 rounded-lg border border-[#c9a14d]/55 bg-[#151310] p-4 text-[#f8efdf] shadow-2xl shadow-black/30 sm:mt-20">
                <div className="flex items-center justify-between gap-3">
                  <PlanBadge dark>Max+</PlanBadge>
                  <span className="rounded-full bg-[#d8b464] px-3 py-1 text-xs font-black text-[#1d1710]">
                    Signature suite
                  </span>
                </div>
                <ProductCard product={maxHeroProduct} elevated />
                <div className="rounded-lg border border-[#d8b464]/25 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d8b464]">
                        Order summary
                      </p>
                      <p className="mt-2 text-lg font-black">QAR 540</p>
                    </div>
                    <BadgeCheck className="h-8 w-8 text-[#d8b464]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbf3e4] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8c3540]">Pro+ Suite</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Premium templates for stores ready to sell.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-7 text-[#6b5942]">
              Pro+ focuses on stronger storefront structure: hero, categories, product cards,
              reviews, trust, and checkout sections that feel finished.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-lg border border-[#dcc6a4] bg-[#f3e3ca] p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-[#8c3540]">Souqna Select</p>
                  <p className="text-xs font-bold text-[#75634c]" dir="rtl">
                    مختارات المتجر
                  </p>
                </div>
                <Store className="h-6 w-6 text-[#8c3540]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['New arrivals', 'Gift sets', 'Local delivery', 'Reviews'].map((item) => (
                  <div key={item} className="rounded-lg bg-white/60 p-4">
                    <Star className="mb-5 h-4 w-4 text-[#b88a3b]" />
                    <p className="text-sm font-black">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {proProducts.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#171411] px-5 py-14 text-[#f8efdf] sm:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8b464]">Max+ Suite</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Editorial product storytelling with a luxury checkout feel.
              </h2>
            </div>
            <p className="text-base font-semibold leading-7 text-[#d8c9aa]">
              Max+ is built for brands that want the full premium impression: campaign sections,
              product storytelling, VIP drops, stronger trust moments, and commerce-ready modules.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-5 md:grid-cols-3">
              {maxProducts.map((product) => (
                <ProductCard key={product.name} product={product} elevated />
              ))}
            </div>
            <div className="rounded-lg border border-[#d8b464]/25 bg-[#211d18] p-5">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8b464]">
                    Campaign drop
                  </p>
                  <h3 className="mt-4 text-3xl font-black">Royal oud collection</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#d8c9aa]" dir="rtl">
                    تجربة عرض فاخرة للمنتجات المميزة مع ثقة واضحة قبل الدفع.
                  </p>
                </div>
                <Zap className="h-8 w-8 text-[#d8b464]" />
              </div>
              <div className="mt-8 grid gap-3">
                {['VIP product story', 'Premium reviews', 'Checkout confidence'].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  >
                    <span className="text-sm font-black">{item}</span>
                    <BadgeCheck className="h-5 w-5 text-[#d8b464]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbf3e4] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8c3540]">
                Actual component showcase
              </p>
              <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
                The Pro+ and Max+ library rendered live, not listed.
              </h2>
            </div>
            <p className="max-w-xl text-base font-semibold leading-7 text-[#6b5942]">
              These are the installed shadcn commerce blocks displayed as real sections: nav,
              heroes, trust, categories, cards, lists, product pages, reviews, order summaries,
              footers, modals, quick views, and background patterns.
            </p>
          </div>

          <section className="space-y-4 rounded-lg border border-[#8c3540]/25 bg-[#f2e4cc] p-5 shadow-2xl shadow-[#8d6b3f]/10">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8c3540]">
                  Souqna-wired preview
                </p>
                <h3 className="mt-2 text-3xl font-black leading-tight">
                  The same premium blocks connected to product media and cart.
                </h3>
                <p className="mt-1 text-sm font-bold text-[#7a6348]" dir="rtl">
                  مكونات مربوطة بالمنتجات والفيديو والسلة
                </p>
              </div>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-[#6a5740]">
                This section uses Souqna wrappers, sample products, a video product, and the real
                cart drawer. It is the production path merchants get when these components are
                saved into a storefront.
              </p>
            </div>
            <SouqnaWiredCommerceShowcase />
          </section>

          {actualPreviewGroups.map((group) => (
            <section key={group.title} className="space-y-4">
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-[#dcc6a4] bg-[#f5ead6] p-5 md:flex-row md:items-end">
                <div>
                  <h3 className="text-3xl font-black leading-tight">{group.title}</h3>
                  <p className="mt-1 text-sm font-bold text-[#7a6348]" dir="rtl">
                    {group.titleAr}
                  </p>
                </div>
                <p className="max-w-2xl text-sm font-semibold leading-6 text-[#6a5740]">
                  {group.summary}
                </p>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                {group.previews.map((preview) => (
                  <LiveComponentPreview key={preview.id} preview={preview} />
                ))}
              </div>
            </section>
          ))}

          <section className="space-y-4 rounded-lg border border-[#d8c09a] bg-[#f5ead6] p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h3 className="text-3xl font-black leading-tight">Offer modals and quick views</h3>
                <p className="mt-1 text-sm font-bold text-[#7a6348]" dir="rtl">
                  النوافذ والعرض السريع
                </p>
              </div>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-[#6a5740]">
                These are real default-open modal components, so they launch on click instead of
                covering the whole showcase on page load.
              </p>
            </div>
            <PortalPreviewLauncher />
          </section>

          <section className="space-y-4 rounded-lg border border-[#d8c09a] bg-[#f5ead6] p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h3 className="text-3xl font-black leading-tight">Background patterns</h3>
                <p className="mt-1 text-sm font-bold text-[#7a6348]" dir="rtl">
                  أنماط الخلفية
                </p>
              </div>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-[#6a5740]">
                Actual CSS pattern presets from the Builder background system, shown with Souqna
                sand, maroon, and charcoal tokens.
              </p>
            </div>
            <PatternPreviewGrid />
          </section>
        </div>
      </section>

      <section className="bg-[#ead7b7] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7f2f3a]">
                Added earlier today
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                The builder upgrades that make the templates sellable.
              </h2>
            </div>
            <p className="text-base font-semibold leading-7 text-[#685236]">
              This strip highlights the system-page and checkout work added in the recent builder
              pass, so the ad page shows both the visual blocks and the merchant controls behind
              them.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentAdditions.map(({ title, titleAr, summary, detail, icon: Icon }) => (
              <article key={title} className="rounded-lg border border-[#c9a875] bg-[#fff8ec] p-5">
                <div className="mb-7 flex items-center justify-between gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#261f17] text-[#d8b464]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <BadgeCheck className="h-5 w-5 text-[#8c3540]" />
                </div>
                <h3 className="text-xl font-black leading-tight">{title}</h3>
                <p className="mt-1 text-sm font-bold text-[#7a6348]" dir="rtl">
                  {titleAr}
                </p>
                <p className="mt-4 text-sm font-semibold leading-6 text-[#6a5740]">{summary}</p>
                <p className="mt-4 rounded-lg bg-[#f0dfc2] px-3 py-2 text-xs font-black text-[#7f2f3a]">
                  {detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5ead6] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-5 md:grid-cols-2">
            {comparison.map((item) => (
              <article
                key={item.plan}
                className="rounded-lg border border-[#d8c09a] bg-white/48 p-6 shadow-xl shadow-[#8d6b3f]/10"
              >
                <div className="mb-8 flex items-center justify-between gap-4">
                  <PlanBadge>{item.plan}</PlanBadge>
                  <span className="text-sm font-bold text-[#856b4a]" dir="rtl">
                    {item.titleAr}
                  </span>
                </div>
                <h3 className="text-3xl font-black">{item.title}</h3>
                <div className="mt-6 grid gap-3">
                  {item.points.map((point) => (
                    <div key={point} className="flex items-center gap-3 rounded-lg bg-[#f7ecd9] p-4">
                      <BadgeCheck className="h-5 w-5 shrink-0 text-[#8c3540]" />
                      <span className="text-sm font-black text-[#4d3f2f]">{point}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-[#d8c09a] bg-[#261f17] p-6 text-[#f8efdf]">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8b464]">
                  Included modules
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  One advertising page. Two premium template paths.
                </h2>
              </div>
              <Link
                href="/pricing-preview"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-[#d8b464] px-5 py-3 text-sm font-black text-[#21180f]"
              >
                Compare Pro+ and Max+
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(({ label, labelAr, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
                  <Icon className="mb-6 h-6 w-6 text-[#d8b464]" />
                  <p className="text-base font-black">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#d7c8ac]" dir="rtl">
                    {labelAr}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <style>{`
        .template-showcase-root .showcase-live-preview {
          --surface-bg: #f5ead6;
          --surface-elevated: #fff8ec;
          --surface-overlay: #ffffff;
          --surface-rule: rgba(38, 31, 23, 0.14);
          --ink-strong: #261f17;
          --ink-muted: rgba(38, 31, 23, 0.68);
          --background: #f5ead6;
          --foreground: #261f17;
          --card: #fff8ec;
          --card-foreground: #261f17;
          --popover: #fff8ec;
          --popover-foreground: #261f17;
          --primary: #261f17;
          --primary-foreground: #f8efdf;
          --secondary: #efe0c6;
          --secondary-foreground: #261f17;
          --muted: rgba(38, 31, 23, 0.08);
          --muted-foreground: rgba(38, 31, 23, 0.65);
          --accent: #efe0c6;
          --accent-foreground: #261f17;
          --border: rgba(38, 31, 23, 0.14);
          --input: rgba(38, 31, 23, 0.16);
          --ring: #8c3540;
        }

        .template-showcase-root .showcase-live-preview .container {
          max-width: 1120px;
          width: 100%;
          margin-inline: auto;
          padding-inline: clamp(14px, 3vw, 28px);
        }

        .template-showcase-root .showcase-live-preview header.py-32,
        .template-showcase-root .showcase-live-preview section.py-32,
        .template-showcase-root .showcase-live-preview section.py-16,
        .template-showcase-root .showcase-live-preview section.md\\:py-24 {
          padding-top: 2rem !important;
          padding-bottom: 2rem !important;
        }

        .template-showcase-root .showcase-live-preview .fixed {
          position: absolute !important;
        }

        .template-showcase-root .showcase-live-preview .showcase-contained-navbar {
          position: absolute !important;
        }

        .template-showcase-root .showcase-live-preview:has(.showcase-contained-navbar) {
          min-height: 170px;
        }

        .template-showcase-root .showcase-live-preview img {
          max-width: 100%;
        }

        @media (max-width: 767px) {
          .template-showcase-root .showcase-live-preview {
            overflow-x: auto;
          }
        }
      `}</style>
    </main>
  );
}
