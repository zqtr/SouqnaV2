import { TextShimmer } from 'souqna';

/* NOTE: TextShimmer sets backgroundImage via its own style prop and spreads
   incoming props afterwards, so passing style={} from outside wipes the
   gradient and the (text-transparent) label vanishes. Set font-size on a
   wrapper instead. */

export const OnDark = () => (
  <div
    data-theme="dark"
    style={{
      background: '#050505',
      padding: '36px 44px',
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}
  >
    <div style={{ fontSize: 18 }}>
      <TextShimmer>Souqy is thinking…</TextShimmer>
    </div>
    <div style={{ fontSize: 13 }}>
      <TextShimmer duration={3}>Searching 1,200 Doha storefronts</TextShimmer>
    </div>
  </div>
);

export const OnLight = () => (
  <div style={{ padding: '28px 36px', fontSize: 16 }}>
    <TextShimmer>Generating your product description…</TextShimmer>
  </div>
);
