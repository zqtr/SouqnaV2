import { Badge } from 'souqna';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <Badge>Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="ghost">Ghost</Badge>
    <Badge variant="link">Link</Badge>
  </div>
);

export const OrderStatuses = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <Badge>Paid</Badge>
    <Badge variant="secondary">Preparing</Badge>
    <Badge variant="outline">Awaiting pickup</Badge>
    <Badge variant="destructive">Refund requested</Badge>
  </div>
);

export const ProductTags = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <Badge variant="secondary">Khalas dates</Badge>
    <Badge variant="secondary">Karak</Badge>
    <Badge variant="secondary">Oud</Badge>
    <Badge variant="outline">Best seller</Badge>
    <Badge>New — جديد</Badge>
  </div>
);
