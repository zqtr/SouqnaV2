import type { BlockRenderProps } from './BlockContext';
import type { ActivityPanelProps } from '@/lib/blocks/types';
import {
  ACTIVITY_APP_IDS,
  isActivityAppId,
  type ActivityAppId,
} from '@/lib/apps/activities/types';
import { ActivityFlow } from '../activities/ActivityFlow';

/**
 * Storefront surface for the Souqna Activities plugins. Sync + server-
 * renderable (like every block): it resolves which installed activity to
 * drive, then delegates the interactive buyer flow to the client
 * `<ActivityFlow>`. In the builder preview it shows a setup placeholder
 * instead of the live flow (no cart context there).
 */
export function ActivityPanelBlock({ block, ctx }: BlockRenderProps<ActivityPanelProps>) {
  const installed = ctx.installedAppIds ?? [];
  const preferred =
    block.props.appId && isActivityAppId(block.props.appId) ? block.props.appId : null;
  const appId: ActivityAppId | null =
    preferred && installed.includes(preferred)
      ? preferred
      : (ACTIVITY_APP_IDS.find((id) => installed.includes(id)) ?? null);

  const title = ctx.isRtl ? block.props.titleAr || block.props.title : block.props.title;

  if (!appId) {
    if (!ctx.isPreview) return null;
    return <Placeholder isRtl={ctx.isRtl} wanted={preferred} />;
  }

  return (
    <ActivityFlow
      storefrontSlug={ctx.storefront.slug}
      appId={appId}
      isRtl={ctx.isRtl}
      title={title}
    />
  );
}

function Placeholder({ isRtl, wanted }: { isRtl: boolean; wanted: ActivityAppId | null }) {
  const msg = isRtl
    ? 'ثبّت تطبيق نشاط سوقنا (حجوزات، مطبخ، أو خياطة) واضبط إعداداته لتفعيل هذه اللوحة للعملاء.'
    : 'Install a Souqna Activity (Booking, Matbakh, or Tailoring) and set it up to make this panel live for buyers.';
  return (
    <section
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: 'clamp(18px, 4vw, 28px)',
        borderRadius: 20,
        border: '1px dashed color-mix(in srgb, var(--sf-ink) 24%, transparent)',
        background: 'color-mix(in srgb, var(--sf-ink) 3%, transparent)',
        color: 'color-mix(in srgb, var(--sf-ink) 66%, transparent)',
        textAlign: 'center',
        fontSize: 13.5,
        lineHeight: 1.6,
      }}
    >
      {wanted ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.7 }}>{wanted}</div> : null}
      {msg}
    </section>
  );
}
