# Codex Carryover For MacBook

Paste this into the new Codex session on the MacBook:

---

We are working on Souqna / Souqy dashboard UI direction.

Current repo and deployment state:

- GitHub repo: `https://github.com/zqtr/SouqnaV2`
- Main branch has been promoted to the latest dashboard work.
- `origin/main` and `origin/codex/selected-web-changes` both pointed to this dashboard commit before this carryover note:
  - `f5c6a3f` - `Polish dashboard controls and dithered charts`
- Production was deployed from that same code via Vercel CLI.
- Production dashboard host to check:
  - `https://souqna.qa/sign-in`
  - `https://souqna.qa/account`
- `orxqa.com/account` returned `404` before and should not be treated as the dashboard host.

Important Windows local context:

- Active working folder on the Windows machine was:
  - `C:\Users\Bo3ab\OneDrive\Desktop\SouqnaFinal\SouqnaV2-selected-web`
- That folder was on branch:
  - `codex/selected-web-changes`
- Another local worktree existed:
  - `C:\Users\Bo3ab\OneDrive\Desktop\SouqnaFinal\SouqnaV2-publish`
- That `SouqnaV2-publish` worktree had `main` checked out but contained many uncommitted changes and was `ahead 8, behind 33`, so it was intentionally left untouched.

MacBook setup goal:

Clone or update from GitHub `main`, because `main` now contains the latest dashboard work:

```bash
git clone https://github.com/zqtr/SouqnaV2.git
cd SouqnaV2
git checkout main
git pull origin main
```

Current product/design direction:

- Dashboard should feel like a modern commerce operating system, not a landing page.
- Strong shadcn/ui-based dashboard system.
- Keep existing chart data and dashboard logic unless explicitly changing chart presentation.
- Recent focus was introducing dithered / ASCII / pixel animated graph styling while preserving data behavior.
- Use dithered animated effects carefully as a visual language.
- Avoid too much green.
- Green is only for success/profit/revenue labels.
- Red is for failed/refund/error states.
- Beige is for important/primary emphasis.
- Support Arabic and English.
- Sidebar and lower-bar controls should feel smoother and more premium.

Theme system decisions:

- User wants customizable dashboard themes with color picker support.
- Currency selector was removed.
- Arabic/English toggle should be in the lower bar, not in a UI window.
- Theme selection should work well on mobile, ideally as a dropdown/sheet stuck to the lower screen and not always visible.
- Theme names selected:
  - Souqna
  - Galaxy
  - Sunset
  - Moonlight
  - Saturn
  - Oryx
  - Lusail
  - Zubarah

Changelog behavior:

- Changelog UI should be a carousel with arrows.
- It should show once.
- After fully read, it should never appear automatically again.
- It should still be accessible from a small Changelogs/Updates icon next to the search bar.

Recent implemented code changes in `f5c6a3f`:

- Updated remaining old dashboard/admin buttons to the newer premium button/action style.
- Removed the currency selector.
- Added/updated changelog carousel behavior.
- Changed product card badge from `Live` to actual stock display, e.g. `1/100 remaining`.
- Added dithered graph components:
  - `src/components/admin/charts/DitheredPixelGraph.tsx`
  - `src/components/admin/charts/InteractiveDitheredTrendChart.tsx`
- Wired dithered mini charts into:
  - `src/components/admin/commerce-metrics.tsx`
- Wired main dashboard trend chart into:
  - `src/app/account/(chrome)/page.tsx`
- Added CSS animation/reduced-motion support in:
  - `src/app/globals.css`

Known instruction from user:

- Do not replace core chart data/business logic unless explicitly asked.
- The user wants the graph direction to look like the provided references:
  - Dithered
  - ASCII
  - Pixel animated graph
  - Premium, smooth, not laggy

When continuing:

1. Pull latest `main`.
2. Run install/build checks according to the repo package manager.
3. If working on dashboard UI, inspect existing components before changing patterns.
4. Preserve auth, data fetching, and chart data behavior.
5. Use shadcn/ui styling patterns and keep mobile behavior in mind.
6. Before pushing, verify the dashboard locally and then push to GitHub `main` or a new branch depending on the requested workflow.

---
