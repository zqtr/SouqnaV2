import { DitherWave } from 'souqna';

export const StudioWave = () => (
  <div
    style={{
      background: '#050505',
      padding: 16,
      borderRadius: 16,
      display: 'inline-block',
    }}
  >
    <DitherWave
      width={600}
      height={220}
      primaryColor="#FFFFFF"
      secondaryColor="#F2DCB5"
      tertiaryColor="#050505"
      intensity={1.0}
      speed={0.8}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#050505',
          textTransform: 'uppercase',
        }}
      >
        Souqy Studio
      </span>
    </DitherWave>
  </div>
);
