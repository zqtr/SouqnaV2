import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
  Input,
  Label,
} from 'souqna';

export const OrderDetailsSheet = () => (
  <Sheet open>
    <SheetContent side="right" showCloseButton={false}>
      <SheetHeader>
        <SheetTitle>Order #SQ-1042</SheetTitle>
        <SheetDescription>
          Placed by Maryam Al-Sulaiti — 2 items, QAR 86.00 total.
        </SheetDescription>
      </SheetHeader>
      <div style={{ display: 'grid', gap: 12, padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Karak chai — large × 2</span>
          <span>QAR 24.00</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Al Wakrah dates box (500g)</span>
          <span>QAR 62.00</span>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label htmlFor="sheet-note">Delivery note</Label>
          <Input id="sheet-note" defaultValue="Leave at reception, Bldg 14" />
        </div>
      </div>
      <SheetFooter>
        <Button>Mark as delivered</Button>
        <Button variant="outline">Print receipt</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
