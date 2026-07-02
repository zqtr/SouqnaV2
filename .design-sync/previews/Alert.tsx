import { Alert, AlertTitle, AlertDescription } from 'souqna';

export const Default = () => (
  <Alert style={{ maxWidth: 460 }}>
    <AlertTitle>Storefront published</AlertTitle>
    <AlertDescription>
      Your storefront is live at qahwa-corner.souqna.qa. Share the link with your customers or
      connect a custom domain from Settings.
    </AlertDescription>
  </Alert>
);

export const Destructive = () => (
  <Alert variant="destructive" style={{ maxWidth: 460 }}>
    <AlertTitle>Payment method expired</AlertTitle>
    <AlertDescription>
      Orders are paused until you update the card on file. No customer data was affected.
    </AlertDescription>
  </Alert>
);

export const TitleOnly = () => (
  <Alert style={{ maxWidth: 460 }}>
    <AlertTitle>3 products are low on stock</AlertTitle>
  </Alert>
);
