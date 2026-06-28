import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Filter, ShoppingBag } from 'lucide-react';
import {
  filterTemplateShowcaseProducts,
  TEMPLATE_SHOWCASE_PRODUCTS,
} from '@/lib/templateShowcaseProducts';

type Props = {
  searchParams?: Promise<{ category?: string | string[] }>;
};

const filters = [
  { label: 'All', href: '/template-showcase/products', key: '' },
  { label: 'Launch', href: '/template-showcase/products?category=launch', key: 'launch' },
  { label: 'Brand', href: '/template-showcase/products?category=brand', key: 'brand' },
  { label: 'Gifts', href: '/template-showcase/products?category=gifts', key: 'gifts' },
  { label: 'Max+', href: '/template-showcase/products?category=max', key: 'max' },
];

export default async function TemplateShowcaseProductsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const products = filterTemplateShowcaseProducts(category);

  return (
    <main className="min-h-dvh bg-[#f5ead6] px-5 py-6 text-[#261f17] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <Link
          href="/template-showcase"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#8c3540]/20 bg-white/55 px-4 py-2 text-sm font-semibold text-[#8c3540] shadow-sm"
        >
          <ArrowLeft className="size-4" />
          Back to showcase
        </Link>

        <section className="rounded-[2rem] border border-[#8c3540]/15 bg-[#fff8eb] p-6 shadow-[0_24px_80px_rgba(38,31,23,0.12)] lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#8c3540]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#8c3540]">
                <ShoppingBag className="size-4" />
                Pro+ and Max+ catalogue
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                Premium template sample products
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f6253]">
                A storefront-safe sample catalogue for testing product links, category filters,
                video product detail, and premium CTAs.
              </p>
            </div>
            <div className="rounded-2xl border border-[#261f17]/10 bg-white/60 p-4 text-sm font-semibold text-[#6f6253]">
              {products.length} of {TEMPLATE_SHOWCASE_PRODUCTS.length} products
            </div>
          </div>
        </section>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Product filters">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#6f6253]">
            <Filter className="size-4" />
            Filters
          </span>
          {filters.map((filter) => {
            const active = (category || '') === filter.key;
            return (
              <Link
                key={filter.href}
                href={filter.href}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? 'border-[#8c3540] bg-[#8c3540] text-white'
                    : 'border-[#8c3540]/15 bg-white/55 text-[#261f17] hover:border-[#8c3540]/40'
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[1.5rem] border border-[#8c3540]/14 bg-[#fff8eb] shadow-[0_16px_48px_rgba(38,31,23,0.10)]"
            >
              <Link href={`/template-showcase/p/${product.id}`} className="block">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#ead9bd]">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[#261f17] px-3 py-1 text-xs font-black text-[#f4d494]">
                    {product.tag}
                  </span>
                </div>
              </Link>
              <div className="grid gap-4 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c3540]">
                    {product.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">{product.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6f6253]">
                    {product.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-lg">QAR {product.priceQar}</strong>
                  <Link
                    href={`/template-showcase/p/${product.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#8c3540] px-4 py-2 text-sm font-bold text-white shadow-sm"
                  >
                    View
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
