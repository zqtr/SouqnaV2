import { Skeleton } from 'souqna';

export const ProductCard = () => (
  <div
    style={{
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      border: '1px solid rgba(31, 27, 22, 0.12)',
      background: 'rgba(255, 255, 255, 0.4)',
    }}
  >
    <Skeleton style={{ height: 150, width: '100%', borderRadius: 12 }} />
    <Skeleton style={{ height: 16, width: '75%' }} />
    <Skeleton style={{ height: 14, width: '45%' }} />
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      <Skeleton style={{ height: 36, flex: 1, borderRadius: 8 }} />
      <Skeleton style={{ height: 36, width: 36, borderRadius: 8 }} />
    </div>
  </div>
);

export const ListingRow = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      width: 360,
      padding: 8,
    }}
  >
    <Skeleton style={{ height: 48, width: 48, borderRadius: 9999 }} />
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}
    >
      <Skeleton style={{ height: 14, width: '60%' }} />
      <Skeleton style={{ height: 12, width: '35%' }} />
    </div>
    <Skeleton style={{ height: 28, width: 72, borderRadius: 9999 }} />
  </div>
);
