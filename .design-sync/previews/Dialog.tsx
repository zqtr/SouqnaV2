import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from 'souqna';

export const EditProduct = () => (
  <Dialog open>
    <DialogContent showCloseButton={false} style={{ maxWidth: 420 }}>
      <DialogHeader>
        <DialogTitle>Edit product</DialogTitle>
        <DialogDescription>
          Update the name and price shown on your storefront. Changes go live immediately.
        </DialogDescription>
      </DialogHeader>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label htmlFor="p-name">Product name</Label>
          <Input id="p-name" defaultValue="Karak chai — large" />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label htmlFor="p-price">Price (QAR)</Label>
          <Input id="p-price" type="number" defaultValue="12" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button>Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
