import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'souqna';

export const ProductCard = () => (
  <Card style={{ maxWidth: 380 }}>
    <CardHeader>
      <CardTitle>Khalas dates — 500g box</CardTitle>
      <CardDescription>Al Wakrah Dates · hand-packed weekly</CardDescription>
      <CardAction>
        <Badge variant="secondary">Best seller</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 600 }}>QAR 45</span>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          / box · 32 in stock
        </span>
      </div>
    </CardContent>
    <CardFooter style={{ gap: 8 }}>
      <Button style={{ flex: 1 }}>Add to cart</Button>
      <Button variant="outline">Details</Button>
    </CardFooter>
  </Card>
);

export const MetricCard = () => (
  <Card style={{ maxWidth: 320 }}>
    <CardHeader>
      <CardDescription>Revenue this week</CardDescription>
      <CardTitle style={{ fontSize: 28 }}>QAR 8,240</CardTitle>
      <CardAction>
        <Badge variant="outline">+12%</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
        64 orders · Qahwa Corner, Souq Waqif
      </span>
    </CardContent>
  </Card>
);
