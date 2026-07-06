// Capture screenshot posters for the public /templates showcase.
//
// For each template it shoots the real live store rendered by
// /template-live/<id> and writes JPEG posters that the /templates index
// (thumbnails) and /templates/<id> detail pages use as the poster shown
// before the interactive iframe loads. Pages fall back to a palette
// gradient when a poster file is missing, so this script is optional —
// run it to replace the gradients with real screenshots.
//
// Usage:
//   1. Start the app:   npx next dev -p 3210   (or `next start`)
//   2. Run:             npm run capture:templates
//   3. Override host:   BASE_URL=http://localhost:3000 npm run capture:templates
//
// Output: public/templates/<id>/preview.jpg | preview-ar.jpg | preview-mobile.jpg

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public', 'templates');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3210';

// Keep in sync with TEMPLATE_IDS in src/lib/brief.ts.
const TEMPLATES = [
  'atrium', 'souqline', 'studio', 'lounge', 'monoline', 'kiosk',
  'bazaar', 'harvest', 'vitrine', 'launchpad', 'frame',
];

const SHOTS = [
  { file: 'preview.jpg', lang: 'en', width: 1440, height: 900 },
  { file: 'preview-ar.jpg', lang: 'ar', width: 1440, height: 900 },
  { file: 'preview-mobile.jpg', lang: 'en', width: 414, height: 896 },
];

async function main() {
  const browser = await chromium.launch();
  let ok = 0;
  let failed = 0;

  for (const id of TEMPLATES) {
    const outDir = resolve(PUBLIC_DIR, id);
    await mkdir(outDir, { recursive: true });

    for (const shot of SHOTS) {
      const url =
        `${BASE_URL}/template-live/${id}` + (shot.lang === 'ar' ? '?lang=ar' : '');
      const page = await browser.newPage({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 2,
      });
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        // Let fonts, seed images, and entrance transitions settle.
        await page.waitForTimeout(1200);
        await page.screenshot({
          path: resolve(outDir, shot.file),
          type: 'jpeg',
          quality: 82,
        });
        ok += 1;
        console.log(`  ✓ ${id}/${shot.file}`);
      } catch (err) {
        failed += 1;
        console.error(`  ✗ ${id}/${shot.file} — ${String(err).split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
  console.log(`\nDone. ${ok} captured, ${failed} failed → public/templates/`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
