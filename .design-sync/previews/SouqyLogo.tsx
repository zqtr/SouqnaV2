import { SouqyLogo } from 'souqna';

export const Sizes = () => (
  <div
    data-theme="dark"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 44,
      background: '#050505',
      padding: '40px 52px',
      borderRadius: 16,
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <SouqyLogo size={24} />
      <span style={{ fontSize: 12, color: 'rgba(241, 233, 215, 0.6)' }}>24px</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <SouqyLogo size={44} />
      <span style={{ fontSize: 12, color: 'rgba(241, 233, 215, 0.6)' }}>44px</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <SouqyLogo size={80} />
      <span style={{ fontSize: 12, color: 'rgba(241, 233, 215, 0.6)' }}>80px</span>
    </div>
  </div>
);
