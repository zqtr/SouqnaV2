# Souqna V2 environment variables

Do not commit `.env`, `.env.local`, `.env.*`, Vercel local env files, private keys, API tokens, webhook secrets, database URLs, or signing keys.

Configure production values in Vercel or the relevant runtime secret store.

## Core web app

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `BRIEF_ROOT_DOMAIN`
- `BRIEF_FALLBACK_ROOT_DOMAIN`
- `NEXT_PUBLIC_SITE_URL`
- `APPS_ENCRYPTION_KEY`
- `ADMIN_REPLY_TOKEN`

## Auth

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

## Mail and notifications

- `MAILER_PROVIDER`
- `CONTACT_FROM`
- `CONTACT_TO`
- `RESEND_API_KEY`
- `POSTMARK_API_TOKEN`
- `POSTMARK_MESSAGE_STREAM`
- `SENT_API_KEY`
- `SENT_WEBHOOK_SIGNING_SECRET`
- `SENT_TEMPLATE_ACCOUNT_NOTIFICATION_ID`
- `SENT_TEMPLATE_CUSTOMER_CARE_ID`
- `SENT_TEMPLATE_DELIVERY_NOTIFICATION_ID`
- `SENT_TEMPLATE_FRAUD_ALERT_ID`
- `SENT_TEMPLATE_MARKETING_ID`

## Payments and billing

- `SKIPCASH_ENV`
- `SKIPCASH_CLIENT_ID`
- `SKIPCASH_KEY_ID`
- `SKIPCASH_KEY_SECRET`
- `SKIPCASH_WEBHOOK_KEY`
- `SKIPCASH_DEFAULT_PHONE`

## AI and generation providers

- `OPENAI_API_KEY`
- `REPLICATE_API_TOKEN`
- `FAL_KEY`
- `IDEOGRAM_API_KEY`
- `FANAR_API_URL`
- `FANAR_API_KEY`
- `FANAR_MODEL`
- `FANAR_TIMEOUT_MS`
- `HF_TOKEN`
- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_CHAT_BASE_URL`
- `HUGGINGFACE_CHAT_MODEL`
- `HUGGINGFACE_ALLOWED_CHAT_MODELS`
- `OLLAMA_URL`

Fanar is optional and is used by Arabic-first Souqy Chat flows when both
`FANAR_API_URL` and `FANAR_API_KEY` are present. The URL is treated as
OpenAI-compatible: a value ending in `/chat/completions` is used as-is, a value
ending in `/v1` receives `/chat/completions`, and any other base URL receives
`/v1/chat/completions`. RunPod vLLM endpoints commonly use:

```text
FANAR_API_URL=https://api.runpod.ai/v2/<endpoint-id>/openai/v1
FANAR_API_KEY=<runpod-api-key>
FANAR_MODEL=QCRI/Fanar-1-9B-Instruct
FANAR_TIMEOUT_MS=180000
```

`FANAR_TIMEOUT_MS` defaults to `90000` and is capped at `180000`.

## Souqy

- `SOUQY_ADMIN_TOKEN`
- `SOUQY_BLOCK_EDIT_MODEL`
- `SOUQY_GENERATE_MODEL`
- `SOUQY_CHAT_MODEL`
- `SOUQY_REPLICATE_TEXT_MODEL`
- `SOUQY_BUILD_SNAPSHOT_ID`
- `SOUQY_MONTHLY_CAP`
- `SOUQY_SCREENSHOT_ENABLED`

## Mobile API compatibility

- `SOUQNA_MOBILE_DEV_AUTH`
- `SOUQNA_MOBILE_DEV_EMAIL`
- `SOUQNA_MOBILE_DEV_NAME`
- `SOUQNA_MOBILE_DEV_TOKEN`
- `SOUQNA_MOBILE_DEV_USER_ID`
- `EXPO_ACCESS_TOKEN`

## Apps and integrations

- `BLOB_READ_WRITE_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID`
- `VERCEL_OIDC_TOKEN`
- `GIPHY_API_KEY`
- `POSTHOG_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_REPLAY`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_GRAPH_VERSION`
- `MAILCHIMP_CLIENT_ID`
- `MAILCHIMP_CLIENT_SECRET`
- `KLAVIYO_CLIENT_ID`
- `KLAVIYO_CLIENT_SECRET`
- `SOUQNA_WHATSAPP_ACCESS_TOKEN`
- `SOUQNA_WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `XAPI_KEY`
- `XAPI_ACTION_HOST`

## CranL runtime, source jobs, and operator companions

- `CRANL_API_KEY`
- `CRANL_RUNTIME_URL`
- `CRANL_DEFAULT_PROVIDER`
- `CRON_SECRET`
- `SOUQNASOURCE_INDEX_CRON_SECRET`
- `SOUQNASOURCE_SYNC_CRON_SECRET`
- `SOUQNASOURCE_DRIFT_THRESHOLD`
- `APIFY_TOKEN`
- `APIFY_MARHABA_ACTOR_ID`
- `APIFY_QATARLIVING_ACTOR_ID`
- `APIFY_QMART_ACTOR_ID`
- `REDIS_URL`
- `PULSE_ADMIN_TOKEN`
- `PULSE_IP_SALT`
- `WORKER_CONCURRENCY`
- `LOG_LEVEL`

`CRANL_RUNTIME_URL` and `CRANL_API_KEY` are read by the Vercel frontend when it
proxies jobs to the separately deployed CranL runtime. The same
`CRANL_API_KEY` must be present in the CranL deployment. `CRANL_DEFAULT_PROVIDER`
controls AI job routing and accepts `openai`, `ollama`, `huggingface`, or
`mock`; it defaults to `openai` in both the web app and CranL runtime.

The SouqnaSource variables remain listed for compatibility with existing
runtime stubs and cron routes. The old SouqnaSource implementation plans were
archived/removed from living docs and should not be treated as current product
direction.

## Optional storefront controls

- `SOUQNA_FEATURED_STOREFRONT_SLUGS`
- `TEST_STOREFRONT_SLUG`
