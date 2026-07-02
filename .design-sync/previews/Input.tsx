import { Input, Label } from 'souqna';

export const WithLabel = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="store-name">Storefront name</Label>
    <Input id="store-name" placeholder="e.g. Qahwa Corner" />
  </div>
);

export const Filled = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="ig-handle">Instagram handle</Label>
    <Input id="ig-handle" defaultValue="@alwakrah.dates" />
  </div>
);

export const Invalid = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="price">Price (QAR)</Label>
    <Input id="price" type="number" defaultValue="-15" aria-invalid />
    <span style={{ fontSize: 13, color: 'var(--destructive)' }}>
      Price must be greater than 0.
    </span>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="cr-number">CR number</Label>
    <Input id="cr-number" defaultValue="CR-2024-118842" disabled />
  </div>
);
