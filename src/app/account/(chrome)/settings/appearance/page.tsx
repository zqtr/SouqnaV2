import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { MonitorCog, Moon, Palette, Sun } from 'lucide-react';
import { PageHeader } from '@/components/admin/primitives';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Reveal } from '@/components/motion/Reveal';
import {
  ADMIN_ACCENTS,
  ADMIN_ACCENT_COOKIE,
  ADMIN_ACCENT_PRESETS,
  type AdminAccent,
} from '@/lib/adminAccent';

async function setAccent(formData: FormData) {
  'use server';
  const raw = formData.get('accent');
  const accent = typeof raw === 'string' ? raw : '';
  if (!ADMIN_ACCENTS.includes(accent as AdminAccent)) return;
  const store = await cookies();
  store.set(ADMIN_ACCENT_COOKIE, accent, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  revalidatePath('/account', 'layout');
}

export default async function AppearanceSettingsPage() {
  const store = await cookies();
  const cookieAccent = store.get(ADMIN_ACCENT_COOKIE)?.value;
  const current: AdminAccent =
    cookieAccent && ADMIN_ACCENTS.includes(cookieAccent as AdminAccent)
      ? (cookieAccent as AdminAccent)
      : 'mono';

  return (
    <>
      <PageHeader
        eyebrow="Settings · Appearance"
        arEyebrow="الإعدادات · المظهر"
        title="Dashboard appearance"
        arTitle="مظهر لوحة التحكم"
        subtitle="Choose a Souqna admin preset, switch light or dark mode, and tune the dashboard without changing the published storefront."
        arSubtitle="اختر نمطاً لإدارة سوقنا وبدّل بين الوضع الفاتح والداكن واضبط اللوحة دون تغيير المتجر المنشور."
      />

      <Reveal y={14}>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
            <CardHeader className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted">
                    <MonitorCog className="size-5" aria-hidden />
                  </span>
                  <div>
                    <CardTitle>Theme mode</CardTitle>
                    <CardDescription className="mt-1 leading-6">
                      Switch the dashboard shell between light and dark mode.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline">Browser</Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <PreviewModeCard icon={Sun} title="Light" body="Clean review mode" />
                <PreviewModeCard icon={Moon} title="Dark" body="Premium operator mode" />
              </div>
              <ThemeToggle label="Toggle theme" />
              <p className="m-0 text-sm leading-6 text-muted-foreground">
                The selected mode is saved in your browser cookie and paints before the dashboard hydrates.
              </p>
            </CardContent>
          </Card>

          <form action={setAccent} className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg border bg-muted">
                  <Palette className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="m-0 text-base font-semibold text-foreground">Souqna presets</h2>
                  <p className="m-0 text-sm text-muted-foreground">
                    Accent, surfaces, borders, and chart color for the admin workspace.
                  </p>
                </div>
              </div>
              <Button type="submit">Save preset</Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ADMIN_ACCENT_PRESETS.map((preset) => {
                const active = preset.id === current;
                return (
                  <label key={preset.id} className="group block cursor-pointer">
                    <input
                      type="radio"
                      name="accent"
                      value={preset.id}
                      defaultChecked={active}
                      className="sr-only"
                    />
                    <Card
                      className={`h-full border-border/80 bg-card/92 py-0 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-card)] ${
                        active ? 'ring-2 ring-[var(--admin-accent)]' : ''
                      }`}
                    >
                      <CardHeader className="px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            aria-hidden
                            className="size-8 rounded-full border shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${preset.swatchLight} 0 50%, ${preset.swatchDark} 50% 100%)`,
                            }}
                          />
                          {active ? <Badge>Active</Badge> : <Badge variant="outline">Preset</Badge>}
                        </div>
                        <div>
                          <CardTitle className="text-base">{preset.label}</CardTitle>
                          <CardDescription lang="ar" dir="rtl" className="mt-1">
                            {preset.arLabel}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="m-0 text-sm leading-6 text-muted-foreground">{preset.blurb}</p>
                        <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden>
                          <span className="h-8 rounded-md" style={{ background: preset.swatchLight }} />
                          <span className="h-8 rounded-md bg-muted" />
                          <span className="h-8 rounded-md bg-[var(--admin-accent-soft)]" />
                          <span className="h-8 rounded-md" style={{ background: preset.swatchDark }} />
                        </div>
                      </CardContent>
                    </Card>
                  </label>
                );
              })}
            </div>

            <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="m-0 max-w-xl text-sm leading-6 text-muted-foreground">
                  Saved per browser. This changes only the authenticated dashboard chrome and analytics surfaces.
                </p>
                <Button type="submit" variant="outline">
                  Save appearance
                </Button>
              </CardContent>
            </Card>
          </form>
        </section>
      </Reveal>
    </>
  );
}

function PreviewModeCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sun;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/35 p-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="mt-2 mb-0 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}
