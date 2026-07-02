import { Label, RadioGroup, RadioGroupItem } from 'souqna';

export const DeliveryMethod = () => (
  <RadioGroup defaultValue="courier" style={{ maxWidth: 360 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <RadioGroupItem value="courier" id="dm-courier" />
      <Label htmlFor="dm-courier">Courier delivery — QAR 15, same day in Doha</Label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <RadioGroupItem value="pickup" id="dm-pickup" />
      <Label htmlFor="dm-pickup">Pickup from Souq Waqif stall</Label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <RadioGroupItem value="freight" id="dm-freight" disabled />
      <Label htmlFor="dm-freight" style={{ opacity: 0.5 }}>
        International freight (coming soon)
      </Label>
    </div>
  </RadioGroup>
);

export const PayoutSchedule = () => (
  <RadioGroup defaultValue="weekly" style={{ maxWidth: 380 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <RadioGroupItem value="daily" id="ps-daily" style={{ marginTop: 2 }} />
      <div style={{ display: 'grid', gap: 2 }}>
        <Label htmlFor="ps-daily">Daily payout</Label>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          1.5% processing fee per transfer
        </span>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <RadioGroupItem value="weekly" id="ps-weekly" style={{ marginTop: 2 }} />
      <div style={{ display: 'grid', gap: 2 }}>
        <Label htmlFor="ps-weekly">Weekly payout</Label>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          Free — settles every Sunday
        </span>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <RadioGroupItem value="monthly" id="ps-monthly" style={{ marginTop: 2 }} />
      <div style={{ display: 'grid', gap: 2 }}>
        <Label htmlFor="ps-monthly">Monthly payout</Label>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          Free — settles on the 1st
        </span>
      </div>
    </div>
  </RadioGroup>
);
