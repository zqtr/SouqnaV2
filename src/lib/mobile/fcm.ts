import 'server-only';

import { createSign } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Minimal FCM HTTP v1 sender for the Flutter merchant app.
 *
 * Deliberately dependency-free: the OAuth2 service-account exchange is a
 * signed RS256 JWT against Google's token endpoint, which node:crypto
 * covers — no firebase-admin, no google-auth-library.
 *
 * Credentials come from either `FIREBASE_SERVICE_ACCOUNT_JSON` (raw or
 * base64-encoded service-account JSON) or the split
 * `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
 * vars for hosts that mangle multi-line values. When neither is set the
 * sender no-ops, so push simply stays off until the env lands.
 */

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let cachedAccount: ServiceAccount | null | undefined;
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;

  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = parseServiceAccountJson(raw) ?? parseServiceAccountJson(tryBase64Decode(raw));
    if (parsed) {
      cachedAccount = parsed;
      return parsed;
    }
    console.error('[mobile.fcm] FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be parsed');
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    cachedAccount = {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    return cachedAccount;
  }

  cachedAccount = null;
  return null;
}

function parseServiceAccountJson(raw: string | null): ServiceAccount | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as {
      project_id?: unknown;
      client_email?: unknown;
      private_key?: unknown;
    };
    if (
      typeof json.project_id === 'string' &&
      typeof json.client_email === 'string' &&
      typeof json.private_key === 'string'
    ) {
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key.replace(/\\n/g, '\n'),
      };
    }
  } catch {
    // fall through
  }
  return null;
}

function tryBase64Decode(raw: string): string | null {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return decoded.trimStart().startsWith('{') ? decoded : null;
  } catch {
    return null;
  }
}

export function hasFcm(): boolean {
  return loadServiceAccount() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

async function fcmAccessToken(account: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.value;
  }

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  let signature: string;
  try {
    signature = signer.sign(account.privateKey, 'base64url');
  } catch (err) {
    console.error('[mobile.fcm] service-account key signing failed', err);
    return null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${signature}`,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      access_token?: string;
      expires_in?: number;
    } | null;
    if (!res.ok || !json?.access_token) {
      console.error('[mobile.fcm] token exchange failed', res.status, json);
      return null;
    }
    cachedAccessToken = {
      value: json.access_token,
      expiresAt: now + Math.min(json.expires_in ?? 3600, 3600),
    };
    return json.access_token;
  } catch (err) {
    console.error('[mobile.fcm] token exchange failed', err);
    return null;
  }
}

export type FcmMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
};

/**
 * Send one message to many FCM device tokens. Returns the tokens FCM
 * reported as no longer registered so the caller can prune them.
 */
export async function sendFcmMessages(
  tokens: string[],
  message: FcmMessage,
): Promise<{ deadTokens: string[] }> {
  const account = loadServiceAccount();
  const unique = [...new Set(tokens)].filter(Boolean);
  if (!account || unique.length === 0) return { deadTokens: [] };

  const accessToken = await fcmAccessToken(account);
  if (!accessToken) return { deadTokens: [] };

  // FCM v1 requires all data values to be strings.
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(message.data ?? {})) {
    if (value !== null && value !== undefined) data[key] = String(value);
  }

  const deadTokens: string[] = [];
  await Promise.all(
    unique.map(async (token) => {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                data,
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                      ...(message.badge != null ? { badge: message.badge } : {}),
                    },
                  },
                },
              },
            }),
          },
        );
        if (res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          error?: { status?: string; details?: Array<{ errorCode?: string }> };
        } | null;
        const errorCode =
          json?.error?.details?.find((d) => d.errorCode)?.errorCode ?? json?.error?.status;
        if (res.status === 404 || errorCode === 'UNREGISTERED' || errorCode === 'NOT_FOUND') {
          deadTokens.push(token);
          return;
        }
        console.error('[mobile.fcm] send failed', res.status, errorCode ?? json);
      } catch (err) {
        console.error('[mobile.fcm] send failed', err);
      }
    }),
  );
  return { deadTokens };
}
