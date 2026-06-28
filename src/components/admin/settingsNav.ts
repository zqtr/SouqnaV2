export type SettingsNavItem = {
  id: string;
  label: string;
  href: string;
  soon?: boolean;
};

export type SettingsNavSection = {
  id: string;
  title: string;
  summary: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_SECTIONS: SettingsNavSection[] = [
  {
    id: 'store-settings',
    title: 'Store settings',
    summary: 'Identity, storefront appearance, contact, checkout, and payment providers.',
    items: [
      { id: 'general', label: 'General', href: '/account/settings/general' },
      { id: 'websites', label: 'Websites', href: '/account/settings/websites' },
      { id: 'brand', label: 'Brand & logo', href: '/account/settings/brand' },
      { id: 'appearance', label: 'Appearance', href: '/account/settings/appearance' },
      { id: 'contact', label: 'Contact details', href: '/account/settings/contact' },
      { id: 'languages', label: 'Languages', href: '/account/settings/languages' },
      { id: 'domain', label: 'Domain', href: '/account/settings/domain', soon: true },
      { id: 'checkout', label: 'Checkout settings', href: '/account/settings/checkout' },
      { id: 'payments', label: 'Payment providers', href: '/account/settings/payments' },
    ],
  },
  {
    id: 'operations',
    title: 'Commerce operations',
    summary: 'Locations, shipping, taxes, markets, and customer-facing policies.',
    items: [
      { id: 'locations', label: 'Locations', href: '/account/settings/locations' },
      { id: 'shipping', label: 'Shipping & delivery', href: '/account/settings/shipping', soon: true },
      { id: 'taxes', label: 'Taxes & duties', href: '/account/settings/taxes', soon: true },
      { id: 'markets', label: 'Markets', href: '/account/settings/markets', soon: true },
      { id: 'policies', label: 'Store policies', href: '/account/settings/policies' },
    ],
  },
  {
    id: 'customers',
    title: 'Customers',
    summary: 'Customer accounts, email notifications, and buyer communication.',
    items: [
      { id: 'customer-accounts', label: 'Customer accounts', href: '/account/settings/customer-accounts' },
      { id: 'notifications', label: 'Email notifications', href: '/account/settings/notifications' },
    ],
  },
  {
    id: 'platform',
    title: 'Platform',
    summary: 'Plan, account, team access, audit log, files, and custom data.',
    items: [
      { id: 'plan', label: 'Plan', href: '/account/settings/plan' },
      { id: 'account', label: 'Your account', href: '/account/settings/account' },
      { id: 'team', label: 'Team', href: '/account/settings/team' },
      { id: 'activity-log', label: 'Activity log', href: '/account/settings/activity-log' },
      { id: 'files', label: 'Files', href: '/account/settings/files' },
      { id: 'custom-data', label: 'Custom data', href: '/account/settings/custom-data', soon: true },
    ],
  },
];
