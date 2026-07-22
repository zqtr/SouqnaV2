/**
 * Export the /begin Instagram-import onboarding (Arabic, dark) as layered
 * transparent PNGs for After Effects.
 *
 * Usage:
 *   IG_IMPORT_USE_MOCK=1 npm run dev -- -p 3155     # in another terminal
 *   node tools/export-onboarding-layers.mjs
 *
 * Env: BASE_URL (default http://localhost:3155), HANDLE (default noura.boutique)
 *
 * Output: ./ae-export/NN_name.png (1080x1920, transparent) + manifest.json
 * with each layer's x/y/w/h in the 1080x1920 pixel space. The silk
 * background plate is 1400x2400, opaque.
 *
 * Isolation technique: every element gets visibility:hidden, then the
 * target subtree is set back to visibility:visible. Unlike display:none
 * this never shifts layout, and a visible child inside a hidden parent
 * still paints — so ancestors are deliberately left hidden (revealing
 * them would paint their backgrounds into the layer).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3155';
const HANDLE = process.env.HANDLE ?? 'noura.boutique';
const OUT = path.resolve('./ae-export');
const DSF = 2; // 540x960 viewport -> 1080x1920 PNGs

fs.mkdirSync(OUT, { recursive: true });

const manifest = [];
let index = 0;
const pad = (n) => String(n).padStart(2, '0');
const log = (...args) => console.log('[export]', ...args);

async function settle(page, ms = 1800) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function freezeMotion(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  });
}

function unionBoxes(boxes) {
  const real = boxes.filter(Boolean);
  if (real.length === 0) return null;
  const x1 = Math.min(...real.map((b) => b.x));
  const y1 = Math.min(...real.map((b) => b.y));
  const x2 = Math.max(...real.map((b) => b.x + b.width));
  const y2 = Math.max(...real.map((b) => b.y + b.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Capture one full-viewport transparent PNG where only `selectors` are
 * visible. `selfOnly` reveals the element's own box (background/border)
 * but keeps its children hidden — used for the panel base.
 */
async function captureLayer(page, name, selectors, { selfOnly = false, note = '' } = {}) {
  const sels = Array.isArray(selectors) ? selectors : [selectors];
  const boxes = [];
  for (const sel of sels) {
    const loc = page.locator(sel);
    const count = await loc.count();
    for (let i = 0; i < count; i++) boxes.push(await loc.nth(i).boundingBox());
  }
  const box = unionBoxes(boxes);
  if (!box) {
    log(`SKIP ${name} — no element matches ${sels.join(', ')}`);
    return;
  }

  await page.evaluate(
    ({ sels, selfOnly }) => {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body
        .querySelectorAll('*')
        .forEach((el) => el.style.setProperty('visibility', 'hidden', 'important'));
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((target) => {
          target.style.setProperty('visibility', 'visible', 'important');
          if (!selfOnly) {
            target
              .querySelectorAll('*')
              .forEach((child) => child.style.setProperty('visibility', 'visible', 'important'));
          }
        });
      }
    },
    { sels, selfOnly },
  );

  index += 1;
  const file = `${pad(index)}_${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), omitBackground: true });

  await page.evaluate(() => {
    document.body
      .querySelectorAll('*')
      .forEach((el) => el.style.removeProperty('visibility'));
  });

  manifest.push({
    file,
    selector: sels.join(' + '),
    note,
    x: Math.round(box.x * DSF),
    y: Math.round(box.y * DSF),
    width: Math.round(box.width * DSF),
    height: Math.round(box.height * DSF),
  });
  log('captured', file);
}

async function typeHandleUntilEnabled(page) {
  for (let i = 0; i < 10; i++) {
    await page.fill('.ig-handle input', '');
    await page.locator('.ig-handle input').pressSequentially(HANDLE, { delay: 20 });
    await page.waitForTimeout(700);
    if (await page.locator('.ig-cta:not([disabled])').count()) return;
  }
  throw new Error('fetch CTA never enabled — is the dev server hydrated?');
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: DSF,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // ————— idle screen —————
  await page.goto(`${BASE}/begin?locale=ar`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ig-step', { timeout: 90000 });
  await freezeMotion(page);
  await settle(page, 2500);
  await page.evaluate(() =>
    document.querySelector('.begin-card')?.scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(400);

  await captureLayer(page, 'panel_base', '.begin-card', {
    selfOnly: true,
    note: 'card background/border only, children hidden',
  });
  await captureLayer(page, 'stepper', '.begin-progress');
  await captureLayer(page, 'pill_badge', '.begin-pill', { note: 'افتح متجرك' });
  await captureLayer(page, 'headline', '.begin-title', { note: 'تبيع على إنستغرام؟' });

  // Empty input: no value, no placeholder — rebuilt as live text in AE.
  await page.evaluate(() => {
    const input = document.querySelector('.ig-handle input');
    if (input) {
      input.value = '';
      input.placeholder = '';
    }
  });
  await captureLayer(page, 'handle_input', '.ig-handle', { note: '@ prefix, field emptied' });
  await captureLayer(page, 'btn_import', '.ig-cta', { note: 'استورد متجري' });
  await captureLayer(page, 'btn_upload', '.ig-secondary', { note: 'ارفع صور المنتجات' });
  await captureLayer(page, 'how_box', '.ig-how', { note: 'dashed 3-step explainer' });
  await captureLayer(page, 'skip_link', '.ig-link.is-skip', { note: 'تخطَّ — سأضيف المنتجات لاحقاً' });
  await captureLayer(page, 'footer_row', '.begin-card-foot', {
    note: 'تابع / step counter / رجوع as one layer',
  });

  // ————— loading screen (analyzing phase) —————
  await typeHandleUntilEnabled(page);
  await page.click('.ig-cta');
  await page.waitForSelector('.ig-loading', { timeout: 60000 });
  await page.waitForTimeout(400);
  await captureLayer(page, 'spinner_ring', '.ig-spinner', { note: 'animation frozen' });
  await captureLayer(page, 'loading_texts', ['.ig-loading b'], {
    note: 'status text; progress bar excluded (rebuild in AE)',
  });

  // ————— chat screen —————
  await page.waitForSelector('.ig-chat-controls', { timeout: 300000 });
  await settle(page, 1200);
  await page.evaluate(() =>
    document.querySelector('.begin-card')?.scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(400);

  await captureLayer(page, 'chat_bubble_intro', '.ig-thread .ig-msg:nth-of-type(1) .ig-bubble');
  await captureLayer(page, 'chat_product_card', '.ig-thread .ig-card');
  await captureLayer(page, 'chat_bubble_question', '.ig-thread .ig-msg:nth-of-type(2) .ig-bubble');
  await captureLayer(page, 'chips_row', '.ig-chips');
  await captureLayer(page, 'answer_input', '.ig-answer', { note: 'input + أرسل button' });

  // ————— review screen —————
  await page.click('.ig-chip.is-quiet'); // accept the rest as-is
  await page.waitForSelector('.ig-summary', { timeout: 30000 });
  await settle(page, 1000);
  // Price numbers get rebuilt as live text in AE — blank the fields.
  await page.evaluate(() => {
    document
      .querySelectorAll('.ig-card-edit-price input')
      .forEach((input) => (input.value = ''));
  });

  for (let i = 1; i <= 3; i++) {
    // The summary list scrolls internally; bring each card into view.
    await page.evaluate((n) => {
      document
        .querySelector(`.ig-summary-list > .ig-card:nth-of-type(${n})`)
        ?.scrollIntoView({ block: 'nearest' });
    }, i);
    await page.waitForTimeout(300);
    await captureLayer(page, `product_card_${i}`, `.ig-summary-list > .ig-card:nth-of-type(${i})`, {
      note: 'price field blanked',
    });
  }
  await captureLayer(
    page,
    'included_badge',
    '.ig-summary-list > .ig-card:nth-of-type(1) .ig-toggle',
    { note: 'مُدرج' },
  );
  await captureLayer(page, 'btn_confirm', '.ig-summary .ig-cta', { note: 'ممتاز — استخدمها' });

  await context.close();

  // ————— silk/bronze background plate, 1400x2400 opaque —————
  const bgContext = await browser.newContext({
    viewport: { width: 700, height: 1200 }, // x2 DSF -> 1400x2400
    deviceScaleFactor: DSF,
    colorScheme: 'dark',
  });
  const bgPage = await bgContext.newPage();
  await bgPage.goto(`${BASE}/begin?locale=ar`, { waitUntil: 'domcontentloaded' });
  await bgPage.waitForSelector('.begin-shell', { timeout: 90000 });
  await freezeMotion(bgPage);
  await settle(bgPage, 3000); // let the silk canvas render fully
  await bgPage.evaluate(() => {
    // Hide the panel + side copy + any chrome outside the shell; keep only
    // the shell's own background stack (canvas + gradient overlay).
    const shell = document.querySelector('.begin-shell');
    document.body.querySelectorAll('body > *').forEach((el) => {
      if (shell && !el.contains(shell) && el !== shell) {
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    });
    shell?.querySelectorAll(':scope > *').forEach((el) => {
      const keepsBackground = el.querySelector('canvas') || el.getAttribute('aria-hidden') === 'true';
      if (!keepsBackground) el.style.setProperty('visibility', 'hidden', 'important');
    });
  });
  index += 1;
  const bgFile = `${pad(index)}_background_silk.png`;
  await bgPage.screenshot({ path: path.join(OUT, bgFile) });
  manifest.push({
    file: bgFile,
    selector: '.begin-shell background stack',
    note: 'opaque plate, own 1400x2400 space (not the 1080x1920 grid)',
    x: 0,
    y: 0,
    width: 1400,
    height: 2400,
  });
  log('captured', bgFile);
  await bgContext.close();

  // ————— manifest —————
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nManifest (coords in 1080x1920 px space):');
  console.table(manifest.map(({ file, x, y, width, height }) => ({ file, x, y, width, height })));
  log(`done — ${manifest.length} layers in ${OUT}`);
} finally {
  await browser.close();
}
