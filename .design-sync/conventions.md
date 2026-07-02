# Souqna design system — build conventions

Souqna is a Qatar commerce platform (storefronts, orders, the Souqy AI studio). Warm, editorial look: sand/cream surfaces, charcoal primary, maroon for destructive, gold reserved for CTAs. English UI uses Exo 2; Arabic uses Thmanyah; JetBrains Mono for numeric/meta text.

## Setup

- **No provider or wrapper is required.** Tokens, fonts, and component styles all ship via `styles.css`. Components render styled as-is.
- Light theme is the default. For a dark surface, set `data-theme="dark"` on any wrapper element — all tokens remap for its descendants. (The `dark:` variant is bound to `[data-theme='dark']`, NOT to a `.dark` class or OS preference.)
- **Do not use `asChild` on triggers wrapped around library components** (e.g. `<DropdownMenuTrigger asChild><Button/>`). This runtime is React 18 and the components are plain function components, so the ref never attaches and Radix poppers position off-screen. Style the trigger element directly instead: `<DropdownMenuTrigger className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium">…</DropdownMenuTrigger>`.

## Styling idiom

Tailwind utility classes, **but only classes present in the shipped stylesheet resolve** — the CSS is compiled ahead of time and there is no JIT, so arbitrary values (`w-[437px]`) and unlisted utilities render as nothing. Safe, verified vocabulary:

- Layout: `flex inline-flex grid items-center justify-between justify-center w-full truncate`
- Spacing: `p-4 p-6 px-4 py-2 gap-1 gap-2 gap-3 gap-4 gap-6`
- Type: `text-xs text-sm text-lg text-2xl font-medium font-semibold font-bold font-sans font-mono`
- Shape: `rounded-md rounded-lg rounded-xl border border-b shadow-xs shadow-sm h-9 h-10`
- Color (token-mapped, theme-aware): `bg-background text-foreground · bg-card text-card-foreground · bg-primary text-primary-foreground · bg-secondary text-secondary-foreground · bg-muted text-muted-foreground · bg-accent · bg-destructive text-destructive`

For anything beyond that vocabulary, use **inline styles**, ideally with the shipped CSS variables: semantic `var(--background) var(--foreground) var(--primary) var(--card) var(--muted-foreground) var(--destructive) var(--accent) var(--radius)` and brand raws `var(--color-sand) var(--color-maroon) var(--color-gold) var(--color-charcoal)`. Brand-color utility classes (`bg-sand`, `text-maroon`…) do NOT exist — use the vars inline.

## Component gotchas

- `TextShimmer`: never pass a `style` prop (it overwrites the shimmer gradient and the text turns invisible) — set font-size on a wrapper.
- `Loader`: the `"classic"` variant is invisible in static frames; prefer `"wave"`, `"dots"`, or `"pulse-dot"`.
- `Field` error state needs both `data-invalid` on `<Field>` and `aria-invalid` on the control.
- Brand pieces: `SouqyLogo` (`size` prop, designed for dark surfaces) and `DitherWave` (animated canvas; `primaryColor="#FFFFFF" secondaryColor="#F2DCB5" tertiaryColor="#050505"` is the Souqy Studio palette).

## Where the truth lives

Read `styles.css` and its imports (`_ds_bundle.css` carries all component CSS + tokens; `fonts/fonts.css` the @font-face set) before inventing styles. Each component's props contract is `components/<group>/<Name>/<Name>.d.ts`, with usage in the sibling `.prompt.md`.

## Idiomatic example

```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from 'souqna';

<Card className="w-full" style={{ maxWidth: 420 }}>
  <CardHeader>
    <CardTitle>Karak chai — large</CardTitle>
    <CardDescription>Qahwa Corner · Doha</CardDescription>
  </CardHeader>
  <CardContent className="flex items-center justify-between">
    <span className="text-2xl font-semibold">QAR 12.00</span>
    <Badge>In stock</Badge>
  </CardContent>
  <CardFooter className="flex gap-2">
    <Button className="w-full">Add to order</Button>
    <Button variant="outline">Preview</Button>
  </CardFooter>
</Card>
```
