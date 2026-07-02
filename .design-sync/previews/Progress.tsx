import { Progress } from 'souqna';

const Row = ({ label, value }: { label: string; value: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.65 }}>{value}%</span>
    </div>
    <Progress value={value} />
  </div>
);

export const Values = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      width: 340,
      padding: 8,
    }}
  >
    <Row label="Storefront setup" value={25} />
    <Row label="Product photos uploading" value={60} />
    <Row label="Payout verification" value={90} />
  </div>
);
