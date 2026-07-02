import { Spinner } from 'souqna';

const Cell = ({
  label,
  size,
}: {
  label: string;
  size: number;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <Spinner style={{ width: size, height: size }} />
    <span style={{ fontSize: 12, opacity: 0.65 }}>{label}</span>
  </div>
);

export const Sizes = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 40,
      padding: '28px 36px',
    }}
  >
    <Cell label="16px" size={16} />
    <Cell label="24px" size={24} />
    <Cell label="32px" size={32} />
    <Cell label="48px" size={48} />
  </div>
);

export const InContext = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '24px 32px',
      fontSize: 14,
      fontWeight: 500,
    }}
  >
    <Spinner style={{ width: 18, height: 18 }} />
    <span>Publishing your storefront…</span>
  </div>
);
