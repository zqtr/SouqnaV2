import type { ProJobStatus } from '@/lib/proMode';

export type RecoverableProJourneyStage =
  | 'scan'
  | 'interview'
  | 'recommendation'
  | 'review'
  | 'converting'
  | 'ready'
  | 'failed';

export type ProJourneyCheckpoint = {
  stage: RecoverableProJourneyStage;
  failureKind: 'recovery' | 'conversion' | 'job' | null;
  message: string | null;
};

/**
 * Browser journey state is only a convenience. Server-owned workspace and job
 * state always wins so an interrupted conversion cannot restore an endless
 * loading screen after a refresh.
 */
export function recoverProJourneyCheckpoint(args: {
  checkpoint: ProJourneyCheckpoint;
  jobStatus: ProJobStatus | null;
  jobErrorMessage?: string | null;
  hasWorkspace: boolean;
  hasReviewCheckpoint: boolean;
}): ProJourneyCheckpoint {
  const { checkpoint, jobStatus, jobErrorMessage, hasWorkspace, hasReviewCheckpoint } = args;

  if (
    jobStatus === 'succeeded' &&
    (checkpoint.stage === 'converting' || checkpoint.stage === 'failed')
  ) {
    return { stage: 'ready', failureKind: null, message: null };
  }

  if (jobStatus === 'failed' && checkpoint.stage === 'converting') {
    return {
      stage: 'failed',
      failureKind: 'job',
      message: jobErrorMessage ?? checkpoint.message,
    };
  }

  if (checkpoint.stage === 'converting' && jobStatus == null) {
    if (hasWorkspace) return { stage: 'ready', failureKind: null, message: null };
    return {
      stage: hasReviewCheckpoint ? 'review' : 'recommendation',
      failureKind: null,
      message: null,
    };
  }

  if (checkpoint.stage === 'ready' && !hasWorkspace && jobStatus !== 'succeeded') {
    return { stage: 'recommendation', failureKind: null, message: null };
  }

  return checkpoint;
}
