'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/checkout-orders';
import { EmptyState } from '@/components/admin/primitives';
import { OrderDrawer } from './OrderDrawer';
import { cn } from '@/lib/utils';
import { adminPhrase } from '@/components/admin/adminLocale';

const STATUS_CHIPS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_CHIPS: { value: '' | PaymentStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'marked_paid', label: 'Paid' },
  { value: 'payment_failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  preparing: 'preparing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};
const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'unpaid',
  marked_paid: 'paid',
  payment_failed: 'failed',
  refunded: 'refunded',
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: 'cod',
  bank_transfer: 'bank',
  fawran: 'fawran',
  skipcash: 'skipcash',
  sadad: 'sadad',
  pay_link: 'pay link',
};

type Props = {
  storeSlug: string;
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  status: OrderStatus | '';
  paymentStatus: PaymentStatus | '';
};

export function OrdersTable({
  storeSlug,
  orders,
  total,
  page,
  pageSize,
  status,
  paymentStatus,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useCallback((text: string) => adminPhrase(locale, text), [locale]);
  const pathname = usePathname() ?? '/account/orders';
  const sp = useSearchParams();
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  function buildHref(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp?.toString() ?? '');
    next.set('store', storeSlug);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    return `${pathname}?${next.toString()}`;
  }

  function navigate(patch: Record<string, string | null>) {
    router.push(buildHref(patch));
  }

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: t('Date'),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: t('Customer'),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customerName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        ),
      },
      {
        id: 'items',
        header: t('Items'),
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {row.original.items.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
        ),
      },
      {
        accessorKey: 'totalQar',
        header: t('Total'),
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {row.original.currency} {row.original.totalQar}
          </span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: t('Method'),
        cell: ({ row }) => (
          <ToneBadge tone="neutral">{t(METHOD_LABEL[row.original.paymentMethod])}</ToneBadge>
        ),
      },
      {
        accessorKey: 'paymentStatus',
        header: t('Payment'),
        cell: ({ row }) => (
          <ToneBadge tone={paymentTone(row.original.paymentStatus)}>
            {t(PAYMENT_LABEL[row.original.paymentStatus])}
          </ToneBadge>
        ),
      },
      {
        accessorKey: 'orderStatus',
        header: t('Order'),
        cell: ({ row }) => (
          <ToneBadge tone={statusTone(row.original.orderStatus)}>
            {t(STATUS_LABEL[row.original.orderStatus])}
          </ToneBadge>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenOrder(row.original)}
          >
            {t('View')}
          </Button>
        ),
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.orderStatus === 'pending').length;
    const unpaid = orders.filter((o) => o.paymentStatus === 'unpaid').length;
    const paidOrders = orders.filter((o) => o.paymentStatus === 'marked_paid');
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.totalQar), 0);
    const aov = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;
    const methodCounts = new Map<string, number>();
    const providerCounts = new Map<string, number>();
    for (const order of orders) {
      const method = t(METHOD_LABEL[order.paymentMethod]);
      methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
      const provider =
        order.platformProvider ||
        (order.paymentMethod === 'skipcash'
          ? 'SkipCash'
          : order.collectionMode === 'offline'
            ? t('Offline')
            : t(METHOD_LABEL[order.paymentMethod]));
      providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1);
    }
    return {
      pending,
      unpaid,
      revenue,
      aov,
      paidCount: paidOrders.length,
      currency: orders[0]?.currency ?? 'QAR',
      methodMix: Array.from(methodCounts.entries()).sort((a, b) => b[1] - a[1]),
      providerMix: Array.from(providerCounts.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [orders, t]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t('On this page')}
          value={orders.length.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')}
          sub={`${t('of')} ${total.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')} ${t('total')}`}
        />
        <Stat
          label={t('Paid revenue')}
          value={`${stats.currency} ${stats.revenue.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')}`}
          sub={`${stats.paidCount.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')} ${t('paid orders')} · ${t('AOV')} ${stats.currency} ${stats.aov.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')}`}
        />
        <Stat
          label={t('Pending')}
          value={String(stats.pending)}
          sub={t('needs action')}
          tone={stats.pending > 0 ? 'warning' : undefined}
        />
        <Stat
          label={t('Unpaid')}
          value={String(stats.unpaid)}
          sub={t('awaiting payment')}
          tone={stats.unpaid > 0 ? 'warning' : undefined}
        />
      </div>

      <PaymentMixCard
        methodMix={stats.methodMix}
        providerMix={stats.providerMix}
        total={orders.length}
        locale={locale}
      />

      <div className="my-5 flex flex-col gap-3">
        <ChipRow
          label={t('Status')}
          chips={STATUS_CHIPS.map((chip) => ({ ...chip, label: t(chip.label) }))}
          active={status}
          onSelect={(value) => navigate({ status: value || null, page: null })}
        />
        <ChipRow
          label={t('Payment')}
          chips={PAYMENT_CHIPS.map((chip) => ({ ...chip, label: t(chip.label) }))}
          active={paymentStatus}
          onSelect={(value) => navigate({ paymentStatus: value || null, page: null })}
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          eyebrow={t('No matches')}
          title={t('No orders to show')}
          body={t(
            'Once a buyer places an order through your storefront checkout it will appear here. Try clearing the filters above if you have narrowed the view.',
          )}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            disabled={!header.column.getCanSort()}
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground disabled:cursor-default"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc'
                              ? '↑'
                              : header.column.getIsSorted() === 'desc'
                                ? '↓'
                                : ''}
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={(e) => {
                      // Clicking a button inside the row shouldn't also open the drawer.
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;
                      setOpenOrder(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        getHref={(nextPage) => buildHref({ page: nextPage === 0 ? null : String(nextPage) })}
      />

      <OrderDrawer open={openOrder != null} order={openOrder} onClose={() => setOpenOrder(null)} />
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warning';
}) {
  return (
    <Card className="gap-1.5 px-5 py-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'warning' ? 'text-amber-600 dark:text-amber-500' : '',
        )}
      >
        {value}
      </p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

function PaymentMixCard({
  methodMix,
  providerMix,
  total,
  locale,
}: {
  methodMix: Array<[string, number]>;
  providerMix: Array<[string, number]>;
  total: number;
  locale: string;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const numberLocale = locale === 'ar' ? 'ar-QA' : 'en-US';
  const rows = providerMix.length ? providerMix : methodMix;

  return (
    <Card className="mt-3 gap-4 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('Payment mix')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Methods and providers used by orders on this page')}
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {total.toLocaleString(numberLocale)} {t('orders')}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{t('No payment data yet')}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {rows.slice(0, 6).map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {count.toLocaleString(numberLocale)} · {pct.toLocaleString(numberLocale)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ChipRow<T extends string>({
  label,
  chips,
  active,
  onSelect,
}: {
  label: string;
  chips: { value: T; label: string }[];
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="me-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <ButtonGroup>
        {chips.map((chip) => (
          <Button
            key={chip.value || '_all'}
            type="button"
            variant={chip.value === active ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(chip.value)}
            aria-pressed={chip.value === active}
          >
            {chip.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  getHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  getHref: (page: number) => string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-5 flex items-center justify-between gap-3" aria-label={t('Pagination')}>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {t('Page')} {(page + 1).toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')} {t('of')}{' '}
        {totalPages.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')}
      </span>
      <ButtonGroup>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => router.push(getHref(page - 1))}
        >
          {t('Previous')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => router.push(getHref(page + 1))}
        >
          {t('Next')}
        </Button>
      </ButtonGroup>
    </nav>
  );
}

function ToneBadge({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
        TONE_CLS[tone],
      )}
    >
      {children}
    </span>
  );
}

const TONE_CLS: Record<'success' | 'warning' | 'critical' | 'info' | 'neutral', string> = {
  success: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  critical: 'border-rose-600/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  info: 'border-sky-600/40 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  neutral: 'border-border bg-muted/40 text-muted-foreground',
};

function statusTone(status: OrderStatus): 'success' | 'warning' | 'critical' | 'info' | 'neutral' {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled') return 'critical';
  if (status === 'pending') return 'warning';
  return 'info';
}

function paymentTone(
  status: PaymentStatus,
): 'success' | 'warning' | 'critical' | 'info' | 'neutral' {
  if (status === 'marked_paid') return 'success';
  if (status === 'payment_failed') return 'critical';
  if (status === 'refunded') return 'critical';
  return 'warning';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
