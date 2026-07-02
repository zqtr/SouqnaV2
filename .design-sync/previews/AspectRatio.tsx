import { AspectRatio } from 'souqna';

export const Wide = () => (
  <div style={{ width: 340, padding: 4 }}>
    <AspectRatio ratio={16 / 9}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #f1e9d7 0%, #e8dcc4 55%, #d9c49a 100%)',
          border: '1px solid rgba(31, 27, 22, 0.14)',
          color: '#1f1b16',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Storefront banner · 16 : 9
      </div>
    </AspectRatio>
  </div>
);

export const Square = () => (
  <div style={{ width: 200, padding: 4 }}>
    <AspectRatio ratio={1}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          background: '#2a2a2a',
          color: '#f1e9d7',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Product photo · 1 : 1
      </div>
    </AspectRatio>
  </div>
);
