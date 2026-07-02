import { Button } from 'souqna';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
    <Button>Publish storefront</Button>
    <Button variant="secondary">Save draft</Button>
    <Button variant="outline">Preview</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="link">View orders</Button>
    <Button variant="destructive">Delete product</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
    <Button size="xs">Tag</Button>
    <Button size="sm">Add product</Button>
    <Button size="default">Add product</Button>
    <Button size="lg">Launch Souqy Studio</Button>
  </div>
);

export const States = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
    <Button disabled>Publishing…</Button>
    <Button variant="outline" disabled>
      Preview
    </Button>
    <Button variant="destructive" disabled>
      Delete product
    </Button>
  </div>
);
