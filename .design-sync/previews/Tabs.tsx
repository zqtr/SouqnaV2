import { Tabs, TabsList, TabsTrigger, TabsContent } from 'souqna';

export const StorefrontTabs = () => (
  <Tabs defaultValue="overview" style={{ maxWidth: 480 }}>
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="orders">Orders</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
    </TabsList>
    <TabsContent value="overview">
      <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
        <p style={{ fontWeight: 600 }}>Qahwa Corner</p>
        <p style={{ fontSize: 14 }}>
          Specialty coffee kiosk in Souq Waqif. 34 products live, 128 orders
          this month, QAR 6,240 in sales.
        </p>
      </div>
    </TabsContent>
    <TabsContent value="orders">
      <p style={{ fontSize: 14, paddingTop: 8 }}>Recent orders appear here.</p>
    </TabsContent>
    <TabsContent value="settings">
      <p style={{ fontSize: 14, paddingTop: 8 }}>Storefront settings.</p>
    </TabsContent>
  </Tabs>
);

export const LineTabs = () => (
  <Tabs defaultValue="orders" style={{ maxWidth: 480 }}>
    <TabsList variant="line">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="orders">Orders</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
    </TabsList>
    <TabsContent value="orders">
      <div style={{ display: 'grid', gap: 6, paddingTop: 10 }}>
        <p style={{ fontSize: 14 }}>
          <strong>#SQ-1042</strong> — Maryam Al-Sulaiti — QAR 86.00
        </p>
        <p style={{ fontSize: 14 }}>
          <strong>#SQ-1041</strong> — Khalid Al-Marri — QAR 42.50
        </p>
      </div>
    </TabsContent>
  </Tabs>
);
