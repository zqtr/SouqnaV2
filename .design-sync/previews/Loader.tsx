import { Loader } from 'souqna';

const Cell = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      minWidth: 72,
    }}
  >
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
    <span style={{ fontSize: 12, opacity: 0.65 }}>{label}</span>
  </div>
);

export const Variants = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 32,
      padding: '24px 28px',
      flexWrap: 'wrap',
    }}
  >
    <Cell label="circular">
      <Loader variant="circular" size="lg" />
    </Cell>
    <Cell label="pulse-dot">
      <Loader variant="pulse-dot" size="lg" />
    </Cell>
    <Cell label="dots">
      <Loader variant="dots" size="lg" />
    </Cell>
    <Cell label="wave">
      <Loader variant="wave" size="lg" />
    </Cell>
    <Cell label="bars">
      <Loader variant="bars" size="lg" />
    </Cell>
    <Cell label="pulse">
      <Loader variant="pulse" size="lg" />
    </Cell>
  </div>
);

export const WithText = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: '20px 28px',
    }}
  >
    <Loader variant="loading-dots" text="Souqy is preparing your storefront" size="md" />
    <Loader variant="text-shimmer" text="Generating product descriptions" size="md" />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Loader variant="typing" size="md" />
      <span style={{ fontSize: 13, opacity: 0.7 }}>Seller is typing</span>
    </div>
  </div>
);
