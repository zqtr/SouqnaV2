import Link from 'next/link';
import { ArrowUpRight, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { analyticsModuleSummary, analyticsModuleTitle, type AnalyticsFeatureModule } from '@/lib/analytics/features';

export function LockedAnalyticsCard({
  module,
  locale,
  ctaLabel,
}: {
  module: AnalyticsFeatureModule;
  locale?: string;
  ctaLabel: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/80 bg-card/86 py-0 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-gold) 16%, transparent), transparent 46%), radial-gradient(circle at top right, color-mix(in srgb, var(--color-maroon) 10%, transparent), transparent 38%)',
        }}
      />
      <CardHeader className="relative gap-3 px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-[color:color-mix(in_srgb,var(--color-gold-deep)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[color:var(--color-maroon)]">
            <LockKeyhole className="size-4" aria-hidden />
          </span>
          <Badge variant="outline" className="border-[color:color-mix(in_srgb,var(--color-gold-deep)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[color:var(--color-maroon)]">
            Pro+
          </Badge>
        </div>
        <div>
          <CardTitle className="text-sm">{analyticsModuleTitle(module, locale)}</CardTitle>
          <CardDescription className="mt-1 leading-6">
            {analyticsModuleSummary(module, locale)}
          </CardDescription>
        </div>
        <CardAction className="hidden" />
      </CardHeader>
      <CardContent className="relative px-4 pb-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {module.metrics.slice(0, 3).map((metric) => (
            <div key={metric} className="h-14 rounded-md border border-dashed border-border bg-muted/30" />
          ))}
        </div>
        <Button asChild size="sm" className="w-full">
          <Link href="/account/settings/plan?plan=pro_plus">
            <Sparkles className="size-4" aria-hidden />
            {ctaLabel}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
