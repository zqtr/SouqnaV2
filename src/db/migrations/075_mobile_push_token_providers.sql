-- The Flutter merchant app registers Firebase (FCM) device tokens, while
-- the earlier Expo companion registered Expo tokens. Track the provider
-- per row so the sender can route each token through the right push API.
-- The historic `expo_push_token` column now stores either token kind.

alter table mobile_push_tokens
  add column if not exists provider text not null default 'expo';

alter table mobile_push_tokens
  add column if not exists app_id text;

create index if not exists mobile_push_tokens_provider_idx
  on mobile_push_tokens (provider);
