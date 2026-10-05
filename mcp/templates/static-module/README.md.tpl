# __PRODUCT_NAME__ (Invinsense module)

Static module scaffolded from the Invinsense Module UI Guide v2.0 (family: __FAMILY_NAME__).
Source guide: https://launcher-invinsense.netlify.app/module-ui-guide

## Run

```bash
npm start        # serves this folder; or open index.html directly
```

## Structure (guide section 20)

```
index.html          shell: sidebar + topbar + page + tour
login.html          auth screen with product lockup (Law 15)
css/__ID__.css      tokens (section 05) for both themes, shell and shared components
js/icons.js         Phosphor Bold paths (MIT) used by this module
js/data.js          NAV model + mock data
js/charts.js        inline SVG charts reading tokens
js/pages.js         PAGES registry, all four states per fetching view
js/tour.js          TOUR_STEPS + spotlight engine
js/app.js           hash router, sidebar/topbar, theme, apps navigator, toasts
assets/             lockups and mark (copy from the shared package, see assets/README.md)
```

## Before you open a pull request

1. Add logo assets (see `assets/README.md`) and the Lottie login illustration.
2. Replace the sample tour copy in `js/tour.js` with steps that teach real tasks.
3. Replace mock data in `js/data.js` and pages in `js/pages.js` with real screens. Keep all four states.
4. Measure contrast for every new foreground on a tint, in both themes.
5. Drop this folder into `public/__ID__/` of invinsense-launcher and add `__ID__: '/__ID__/index.html#/dashboard'` to `INTERNAL_MODULE_URLS` in `ModuleWidgets.jsx`. The id must match the `catalog.js` entry.
6. Run `npm run slop` in the launcher repo and reach zero violations.

Use the react-nextjs-bp MCP while you work: `review_invinsense_ui`, `get_invinsense_tokens`, `invinsense_new_module_checklist`.
