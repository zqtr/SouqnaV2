import 'server-only';
import { auth } from '@clerk/nextjs/server';

export async function getAdminUserId(scope: string): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch (err) {
    if (isNextDynamicServerUsageError(err)) throw err;
    console.error(`[admin/auth] ${scope} auth failed`, err);
    return null;
  }
}

function isNextDynamicServerUsageError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const digest = 'digest' in err ? String((err as { digest?: unknown }).digest) : '';
  const message = err instanceof Error ? err.message : '';
  return digest === 'DYNAMIC_SERVER_USAGE' || message.includes('Dynamic server usage');
}
