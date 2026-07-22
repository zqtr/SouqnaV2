import type { ProJobStatus } from '@/lib/proMode';

export type ProGenerationStage = 'reading' | 'designing' | 'building' | 'repairing' | 'rendering';

export type ProGenerationProgress = {
  asset: string;
  stage: ProGenerationStage;
  step: 1 | 2 | 3 | 4;
};

const PRO_GENERATION_PROGRESS: Record<ProGenerationStage, ProGenerationProgress> = {
  reading: { asset: '/pro/loaders/reading-storefront.svg', stage: 'reading', step: 1 },
  designing: { asset: '/pro/loaders/shaping-design.svg', stage: 'designing', step: 2 },
  building: { asset: '/pro/loaders/building-update.svg', stage: 'building', step: 3 },
  repairing: { asset: '/pro/loaders/building-update.svg', stage: 'repairing', step: 3 },
  rendering: { asset: '/pro/loaders/rendering-preview.svg', stage: 'rendering', step: 4 },
};

export function getProGenerationProgress(status: ProJobStatus | null): ProGenerationProgress {
  if (status === 'generating') return PRO_GENERATION_PROGRESS.designing;
  if (status === 'validating') return PRO_GENERATION_PROGRESS.building;
  if (status === 'repairing') return PRO_GENERATION_PROGRESS.repairing;
  if (status === 'building') return PRO_GENERATION_PROGRESS.rendering;
  return PRO_GENERATION_PROGRESS.reading;
}
