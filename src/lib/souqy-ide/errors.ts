/**
 * Souqy IDE error contract (Master Plan Phase 0).
 *
 * Every error that can reach the Studio/IDE UI is reduced to a stable code,
 * a retryability flag, and bilingual human copy. Raw `error.message` strings
 * from providers, fetch, or the runtime must never be rendered — map them
 * through `toSouqyIdeError` at the boundary instead.
 *
 * This module is intentionally dependency-free and safe to import from both
 * server and client code.
 */

export const SOUQY_IDE_ERROR_CODES = [
  'network',
  'auth',
  'quota',
  'provider_unavailable',
  'provider_timeout',
  'stream_interrupted',
  'invalid_input',
  'unknown',
] as const;

export type SouqyIdeErrorCode = (typeof SOUQY_IDE_ERROR_CODES)[number];

export type SouqyIdeClientError = {
  code: SouqyIdeErrorCode;
  retryable: boolean;
  message: { en: string; ar: string };
};

const ERROR_COPY: Record<SouqyIdeErrorCode, SouqyIdeClientError> = {
  network: {
    code: 'network',
    retryable: true,
    message: {
      en: 'Connection failed. Check your internet and try again.',
      ar: 'تعذر الاتصال. تحقق من الإنترنت وحاول مجددًا.',
    },
  },
  auth: {
    code: 'auth',
    retryable: false,
    message: {
      en: 'Your session has expired. Sign in again to continue.',
      ar: 'انتهت صلاحية الجلسة. سجّل الدخول مجددًا للمتابعة.',
    },
  },
  quota: {
    code: 'quota',
    retryable: true,
    message: {
      en: 'You have reached the usage limit for now. Try again shortly.',
      ar: 'وصلت إلى حد الاستخدام حاليًا. حاول مجددًا بعد قليل.',
    },
  },
  provider_unavailable: {
    code: 'provider_unavailable',
    retryable: true,
    message: {
      en: 'The AI service is unavailable right now. Try again in a moment.',
      ar: 'خدمة الذكاء الاصطناعي غير متاحة حاليًا. حاول مجددًا بعد لحظات.',
    },
  },
  provider_timeout: {
    code: 'provider_timeout',
    retryable: true,
    message: {
      en: 'The AI took too long to respond. Try again.',
      ar: 'استغرق الرد وقتًا أطول من المتوقع. حاول مجددًا.',
    },
  },
  stream_interrupted: {
    code: 'stream_interrupted',
    retryable: true,
    message: {
      en: 'The response was interrupted. Retry to continue.',
      ar: 'انقطع الرد قبل اكتماله. أعد المحاولة للمتابعة.',
    },
  },
  invalid_input: {
    code: 'invalid_input',
    retryable: false,
    message: {
      en: 'That request could not be processed. Adjust it and try again.',
      ar: 'تعذرت معالجة هذا الطلب. عدّله وحاول مجددًا.',
    },
  },
  unknown: {
    code: 'unknown',
    retryable: true,
    message: {
      en: 'Something went wrong. Try again.',
      ar: 'حدث خطأ ما. حاول مجددًا.',
    },
  },
};

export function souqyIdeError(code: SouqyIdeErrorCode): SouqyIdeClientError {
  return ERROR_COPY[code];
}

export function isSouqyIdeErrorCode(value: unknown): value is SouqyIdeErrorCode {
  return (
    typeof value === 'string' && SOUQY_IDE_ERROR_CODES.includes(value as SouqyIdeErrorCode)
  );
}

/**
 * Reduce any thrown value to the client error contract. Recognizes Fanar
 * provider errors by name (avoids a server-only import), fetch/network
 * failures, aborts/timeouts, and HTTP status codes carried on the error.
 */
export function toSouqyIdeError(error: unknown): SouqyIdeClientError {
  if (isSouqyIdeClientError(error)) return error;

  if (error instanceof Error) {
    if (error.name === 'FanarConfigurationError') return ERROR_COPY.provider_unavailable;
    if (error.name === 'TimeoutError') return ERROR_COPY.provider_timeout;
    if (error.name === 'AbortError') return ERROR_COPY.stream_interrupted;

    const status = extractStatus(error);
    if (status !== null) return fromHttpStatus(status);

    if (error.name === 'FanarRequestError') return ERROR_COPY.provider_unavailable;

    // fetch() rejects with TypeError on DNS/connection failures.
    if (error instanceof TypeError) return ERROR_COPY.network;
  }

  return ERROR_COPY.unknown;
}

export function fromHttpStatus(status: number): SouqyIdeClientError {
  if (status === 401 || status === 403) return ERROR_COPY.auth;
  if (status === 402 || status === 429) return ERROR_COPY.quota;
  if (status === 408 || status === 504) return ERROR_COPY.provider_timeout;
  if (status >= 500) return ERROR_COPY.provider_unavailable;
  if (status >= 400) return ERROR_COPY.invalid_input;
  return ERROR_COPY.unknown;
}

export function souqyIdeErrorMessage(error: unknown, locale: 'en' | 'ar' = 'en'): string {
  return toSouqyIdeError(error).message[locale];
}

function isSouqyIdeClientError(value: unknown): value is SouqyIdeClientError {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SouqyIdeClientError>;
  return (
    isSouqyIdeErrorCode(candidate.code) &&
    typeof candidate.retryable === 'boolean' &&
    typeof candidate.message?.en === 'string' &&
    typeof candidate.message?.ar === 'string'
  );
}

function extractStatus(error: Error): number | null {
  const status = (error as Error & { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}
