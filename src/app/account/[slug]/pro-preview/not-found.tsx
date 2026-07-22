'use client';

import { usePathname } from 'next/navigation';

export default function ProPreviewNotFound() {
  const pathname = usePathname() ?? '';
  const baseHref = pathname.match(/^(\/account\/[^/]+\/pro-preview)/u)?.[1] ?? '/account';
  return (
    <main
      className="grid min-h-dvh place-items-center bg-[#161310] p-6 text-center text-[#f2e9d8]"
      dir="auto"
    >
      <div className="max-w-xl">
        <p className="font-mono text-[11px] tracking-[0.2em] text-[#d4b06a]">
          404 · PRIVATE PRO PREVIEW
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
          Page not found · الصفحة غير موجودة
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#c9beac]">
          This route is not part of the private preview. هذا المسار غير موجود ضمن المعاينة الخاصة.
        </p>
        <a
          href={baseHref}
          className="mt-7 inline-flex min-h-11 items-center rounded-full border border-[#d4b06a]/40 bg-[#d4b06a]/10 px-5 text-sm font-medium text-[#f2e9d8] no-underline transition hover:bg-[#d4b06a]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b06a]"
        >
          Back to preview · العودة للمعاينة
        </a>
      </div>
    </main>
  );
}
