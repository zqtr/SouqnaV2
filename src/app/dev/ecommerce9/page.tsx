import { notFound } from 'next/navigation';
import { getStorefront } from '@/lib/brief';
import { getPublicProducts } from '@/lib/products';
import { Storefront } from '@/components/storefront/Storefront';
import type { Block, EcommerceProduct } from '@/lib/blocks/types';

// TEMP dev-only, no-auth preview of the ecommerce9 quick-add grid block
// for headless screenshots. 404s in production.
export const dynamic = 'force-dynamic';

const SIZED_DEMO_PRODUCTS: EcommerceProduct[] = [
  {
    id: 'demo-parka',
    name: 'Transit Parka',
    category: 'Outerwear',
    price: 'QAR 310',
    priceQar: 310,
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
    href: '#',
    available: true,
    createdAt: new Date().toISOString(),
    sizes: [{ label: 'S' }, { label: 'M' }, { label: 'L' }],
    sizeOptionPrices: [
      { label: 'S', priceDeltaQar: 0 },
      { label: 'M', priceDeltaQar: 0 },
      { label: 'L', priceDeltaQar: 25 },
    ],
  },
  {
    id: 'demo-crew',
    name: 'Merino Rib Crew',
    category: 'Knitwear',
    price: 'QAR 148',
    priceQar: 148,
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80',
    href: '#',
    available: true,
    sizes: [{ label: 'S' }, { label: 'M' }, { label: 'L' }],
  },
  {
    id: 'demo-sling',
    name: 'Loop Sling',
    category: 'Accessories',
    price: 'QAR 86',
    priceQar: 86,
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80',
    href: '#',
    available: true,
  },
  {
    id: 'demo-vest',
    name: 'Quilted Field Vest',
    category: 'Outerwear',
    price: 'QAR 224',
    priceQar: 224,
    imageUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900&q=80',
    href: '#',
    available: false,
    sizes: [{ label: 'S' }, { label: 'M' }, { label: 'L' }],
  },
  {
    id: 'demo-variant',
    name: 'Soft Collar Cardigan',
    category: 'Knitwear',
    price: 'QAR 192',
    priceQar: 192,
    imageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=900&q=80',
    href: '#',
    available: true,
    variantOptions: ['Oat', 'Charcoal'],
  },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DevEcommerce9Preview({ searchParams }: Props) {
  if (process.env.NODE_ENV === 'production') notFound();
  const params = await searchParams;
  const store = typeof params.store === 'string' ? params.store : 'twd';
  const theme = params.theme === 'dark' ? 'dark' : 'light';
  const sizesDemo = params.demo === 'sizes';
  const blockType =
    params.type === 'ecommerce2' || params.type === 'ecommerce6'
      ? params.type
      : ('ecommerce9' as const);

  const data = await getStorefront(store);
  if (!data) notFound();
  const products = sizesDemo ? [] : await getPublicProducts(store);

  const blocks: Block[] = [
    {
      id: 'dev-ecommerce9',
      type: blockType,
      props: {
        eyebrow: 'Shop',
        title: 'Layers for the in-between months',
        subtitle: 'Free exchanges, always',
        cta: { label: 'View all', href: '#' },
        ...(sizesDemo
          ? { products: SIZED_DEMO_PRODUCTS }
          : {
              productSource: {
                source: 'all' as const,
                limit: 12,
                sort: 'newest' as const,
                hideUnavailable: false,
              },
            }),
      },
    },
  ];

  return (
    <Storefront
      data={data}
      products={products}
      overrideBlocks={blocks}
      visitorTheme={theme}
    />
  );
}
