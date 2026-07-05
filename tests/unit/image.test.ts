import { describe, it, expect } from 'vitest';
import { canOptimizeImage, optimizedImageAttrs, optimizedBackgroundUrl } from '@/lib/image';

describe('canOptimizeImage', () => {
  it('optimizes allowlisted remote hosts', () => {
    expect(canOptimizeImage('https://abc123.public.blob.vercel-storage.com/p.jpg')).toBe(true);
    expect(canOptimizeImage('https://deifkwefumgah.cloudfront.net/x.jpg')).toBe(true);
    expect(canOptimizeImage('https://images.unsplash.com/photo-1')).toBe(true);
  });
  it('optimizes local paths', () => {
    expect(canOptimizeImage('/videos/hero.jpg')).toBe(true);
  });
  it('passes through non-optimizable sources', () => {
    expect(canOptimizeImage('https://evil.example.com/p.jpg')).toBe(false); // unknown host
    expect(canOptimizeImage('https://abc.public.blob.vercel-storage.com/logo.svg')).toBe(false); // svg
    expect(canOptimizeImage('https://abc.public.blob.vercel-storage.com/anim.gif')).toBe(false); // gif
    expect(canOptimizeImage('data:image/png;base64,AAAA')).toBe(false);
    expect(canOptimizeImage('blob:https://x/y')).toBe(false);
    expect(canOptimizeImage('//protocol-relative.com/x.jpg')).toBe(false);
    expect(canOptimizeImage(undefined)).toBe(false);
    expect(canOptimizeImage('')).toBe(false);
  });
});

describe('optimizedImageAttrs', () => {
  it('builds a responsive srcSet with only allowed widths through the optimizer', () => {
    const url = 'https://abc.public.blob.vercel-storage.com/p.jpg';
    const { src, srcSet } = optimizedImageAttrs(url);
    expect(src).toContain('/_next/image?url=');
    expect(src).toContain('w=1080');
    expect(srcSet).toBeDefined();
    const candidates = srcSet!.split(', ');
    expect(candidates).toHaveLength(7);
    for (const c of candidates) {
      expect(c).toMatch(/^\/_next\/image\?url=.+&w=\d+&q=\d+ \d+w$/);
      expect(c).toContain(encodeURIComponent(url));
    }
    const widths = candidates.map((c) => Number(c.match(/&w=(\d+)/)![1]));
    expect(widths).toEqual([256, 384, 640, 828, 1080, 1200, 1920]);
  });
  it('leaves non-optimizable sources untouched (no srcSet)', () => {
    const svg = 'https://abc.public.blob.vercel-storage.com/logo.svg';
    expect(optimizedImageAttrs(svg)).toEqual({ src: svg });
  });
});

describe('optimizedBackgroundUrl', () => {
  it('snaps to an allowed width and returns an optimizer url', () => {
    const out = optimizedBackgroundUrl('https://deifkwefumgah.cloudfront.net/hero.jpg', 1600);
    expect(out).toContain('/_next/image?url=');
    expect(out).toContain('w=1920'); // 1600 snaps up to 1920
  });
  it('returns raw url for non-optimizable and empty for nullish', () => {
    expect(optimizedBackgroundUrl('https://evil.example.com/h.jpg')).toBe('https://evil.example.com/h.jpg');
    expect(optimizedBackgroundUrl(undefined)).toBe('');
  });
});
