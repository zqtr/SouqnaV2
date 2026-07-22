import { notFound } from 'next/navigation';
import { StudioShell } from '@/components/sections/begin/souqy-studio/StudioShell';

// TEMP dev-only, no-auth preview of the Souqy Studio shell for headless
// screenshots while rebuilding the Console layout. 404s in production.
export const dynamic = 'force-dynamic';

export default function DevStudioPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <StudioShell locale="en" initialTab="code" />;
}
