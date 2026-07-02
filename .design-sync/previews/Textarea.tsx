import { Textarea, Label } from 'souqna';

export const WithLabel = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
    <Label htmlFor="store-bio">Store description</Label>
    <Textarea
      id="store-bio"
      placeholder="Tell shoppers what makes your store special…"
    />
  </div>
);

export const Filled = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
    <Label htmlFor="product-desc">Product description</Label>
    <Textarea
      id="product-desc"
      defaultValue={
        'Premium Khalas dates from Al Wakrah farms — hand-picked, pitted and packed fresh weekly. تمور خلاص فاخرة. 500g box.'
      }
    />
  </div>
);

export const Invalid = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
    <Label htmlFor="refund-reason">Refund reason</Label>
    <Textarea id="refund-reason" defaultValue="n/a" aria-invalid />
    <span style={{ fontSize: 13, color: 'var(--destructive)' }}>
      Please describe the issue in at least 20 characters.
    </span>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
    <Label htmlFor="courier-notes">Courier notes (locked after dispatch)</Label>
    <Textarea
      id="courier-notes"
      defaultValue="Leave at reception, Tower 3, West Bay."
      disabled
    />
  </div>
);
