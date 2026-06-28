import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, ShoppingBag, Video } from 'lucide-react';
import { findTemplateShowcaseProduct } from '@/lib/templateShowcaseProducts';

export function TemplateShowcaseProductDetail({ segment }: { segment: string | undefined }) {
  const product = findTemplateShowcaseProduct(segment);
  if (!product) notFound();

  return (
    <main className="min-h-dvh bg-[#f5ead6] px-5 py-6 text-[#261f17] sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-8">
        <Link
          href="/template-showcase/products"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#8c3540]/20 bg-white/55 px-4 py-2 text-sm font-semibold text-[#8c3540] shadow-sm"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>

        <section className="grid overflow-hidden rounded-[2rem] border border-[#8c3540]/15 bg-[#fff8eb] shadow-[0_24px_80px_rgba(38,31,23,0.14)] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[420px] bg-[#ead9bd]">
            {product.videoUrl ? (
              <video
                src={product.videoUrl}
                poster={product.image}
                className="h-full min-h-[420px] w-full object-cover"
                controls
                playsInline
              />
            ) : (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 52vw, 100vw"
                priority
              />
            )}
          </div>

          <div className="flex flex-col justify-between gap-8 p-6 lg:p-10">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#8c3540]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8c3540]">
                  <ShoppingBag className="size-4" />
                  {product.tag}
                </span>
                {product.videoUrl ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#261f17] px-3 py-1 text-xs font-bold text-[#f4d494]">
                    <Video className="size-4" />
                    Video media
                  </span>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9f7a2f]">
                  {product.category}
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  {product.name}
                </h1>
                <p className="mt-2 text-xl font-semibold text-[#8c3540]">{product.nameAr}</p>
              </div>

              <p className="text-base leading-8 text-[#6f6253]">{product.description}</p>

              <div className="grid gap-3 rounded-3xl border border-[#261f17]/10 bg-white/60 p-4">
                {[
                  'Product route is clickable from premium cards, lists, categories, offers, and quick-view.',
                  'Media can be image or video, matching Souqna product media fields.',
                  'Variant and size pricing are handled by the real Souqna product/cart components.',
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm font-semibold text-[#4a4035]">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#8c3540]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <strong className="text-3xl">QAR {product.priceQar}</strong>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/template-showcase/products"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#8c3540]/20 bg-white px-5 py-3 text-sm font-black text-[#8c3540]"
                >
                  View catalogue
                </Link>
                <Link
                  href="/pricing-preview"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8c3540] px-5 py-3 text-sm font-black text-white shadow-sm"
                >
                  Upgrade templates
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
