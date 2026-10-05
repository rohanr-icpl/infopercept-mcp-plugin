# __PRODUCT_NAME__ (Invinsense product)

Next.js App Router project scaffolded from the Invinsense Module UI Guide v2.0 (family: __FAMILY_NAME__)
and React / Next.js best practices.
Guide: https://launcher-invinsense.netlify.app/module-ui-guide

## Run

```bash
npm install
npm run dev
```

## What is wired

- Shell: fixed 262px sidebar (76px rail), 58px topbar with the fixed control order, scrolling content.
- Tokens in `src/app/globals.css` for dark and light via `html[data-theme]`, restored before first paint.
- Geist and Geist Mono through `next/font` (the `geist` package), Phosphor Bold icons.
- Guided tour with nextstepjs 2.2.0 (`src/components/tour`), auto-starts once, replay from topbar and sidebar.
- All four states: `loading.tsx`, `EmptyState`, `ErrorState` with a copyable correlation ID, and a partial banner.
- Server Components by default; `"use client"` only on interactive shell pieces.
- `/login` screen with the product lockup.

## Still to do

1. Add logo assets under `public/assets` (`mark.svg`, `logo-invinsense.svg`, `logo-invinsense-white.svg`) from the shared package. Never recolour or recreate them.
2. Replace sample tour copy in `src/components/tour/tours.ts` with steps that teach real tasks.
3. Replace mock data with real data fetched in Server Components. Charts use reaviz (Law 18).
4. Measure contrast in both themes and screenshot dark + light before the PR.

Use the react-nextjs-bp MCP while you work: `review_invinsense_ui`, `review_code`, `get_invinsense_tokens`, `invinsense_new_module_checklist`.

## UI library (invin-uix)

Charts, KPI cards, badges and data tables come from `invin-uix` (the shared Invinsense component library, built on Tailwind v4).
- `src/app/uix.css` wires Tailwind utilities and the invin-uix tokens. Keep it imported before `globals.css`.
- Element resets in `globals.css` live in `@layer base` so library utilities always win. Do not move them out of the layer.
- Import components by path, e.g. `import { KpiCard } from "invin-uix/ui/kpi-card"`. Pass `var(--primary)` and the severity tokens as colours, never hex.
- `src/components/dashboard/Overview.tsx` is a working example of the four chart types, KPI cards and the data table.
