import 'server-only';
import { env } from '@/lib/env';

/**
 * Server-computed capability flags for the /begin Instagram import step,
 * passed down as props so the client never renders an entry point that
 * can't work: no provider → manual upload only; no gateway creds → the
 * chat runs deterministic questions + regex price parsing.
 */
export function igImportCapabilities(): { provider: boolean; ai: boolean } {
  return {
    provider: env.IG_IMPORT_USE_MOCK || Boolean(env.APIFY_TOKEN || process.env.APIFY_TOKEN),
    ai: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
  };
}
