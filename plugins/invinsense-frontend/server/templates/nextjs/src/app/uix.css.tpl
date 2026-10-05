/* invin-uix (the shared Invinsense component library) is built on Tailwind v4 utilities and its own token block.
   Preflight is skipped on purpose so the shell styles in globals.css are untouched.
   Layer order matters: element resets (layer "base" in globals.css) must LOSE to Tailwind utilities,
   otherwise `p { margin: 0 }` cancels the spacing classes inside invin-uix components. */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "invin-uix/tokens.css";
@source "../../node_modules/invin-uix/dist";

/* invin-uix sets size with text-[length:var(--text-*)] but not the paired line-height
   (the library expects Tailwind preflight and the text-* theme utilities). Pair them here so
   type matches the guide scale: size / line-height / weight. */
@layer utilities {
  .text-\[length\:var\(--text-display\)\]    { line-height: var(--text-display-lh); }
  .text-\[length\:var\(--text-title\)\]      { line-height: var(--text-title-lh); }
  .text-\[length\:var\(--text-section\)\]    { line-height: var(--text-section-lh); }
  .text-\[length\:var\(--text-page-title\)\] { line-height: var(--text-page-title-lh); }
  .text-\[length\:var\(--text-body\)\]       { line-height: var(--text-body-lh); }
  .text-\[length\:var\(--text-label\)\]      { line-height: var(--text-label-lh); }
  .text-\[length\:var\(--text-caption\)\]    { line-height: var(--text-caption-lh); }
  .text-\[length\:var\(--text-data\)\]       { line-height: var(--text-data-lh); }
}
