import { describe, expect, it } from 'vitest';
import { getProGenerationProgress } from '@/lib/pro/generationProgress';

describe('Souqna Pro generation progress', () => {
  it.each([
    ['queued', 'reading', 1, '/pro/loaders/reading-storefront.svg'],
    ['generating', 'designing', 2, '/pro/loaders/shaping-design.svg'],
    ['validating', 'building', 3, '/pro/loaders/building-update.svg'],
    ['repairing', 'repairing', 3, '/pro/loaders/building-update.svg'],
    ['building', 'rendering', 4, '/pro/loaders/rendering-preview.svg'],
  ] as const)('maps %s to the correct visible stage', (status, stage, step, asset) => {
    expect(getProGenerationProgress(status)).toEqual({ stage, step, asset });
  });

  it('starts with the reading stage while the request is being created', () => {
    expect(getProGenerationProgress(null).stage).toBe('reading');
    expect(getProGenerationProgress('succeeded').stage).toBe('reading');
  });
});
