export interface Gap { id: string; title: string; present: boolean; how: string; practiceId: string }

/** Structural checks from the new-module checklist. `all` is the concatenated project source. */
export function structuralGaps(all: string, deps: string[]): Gap[] {
  const gap = (id: string, title: string, present: boolean, how: string, practiceId: string): Gap => ({ id, title, present, how, practiceId });
  const gaps: Gap[] = [
    gap("tokens", "Shared OKLCH token set (section 05)", /--background\s*:/.test(all) && /--accent\s*:/.test(all), "Adopt the token block verbatim; set --accent to the family pair.", "invinsense-tokens"),
    gap("theme", "Theme via html[data-theme], restored before first paint", /data-theme/.test(all), "Add the attribute, a topbar toggle and a pre-paint restore script.", "invinsense-theme"),
    gap("fonts", "Geist and Geist Mono", /geist/i.test(all) || deps.some((d) => /geist/i.test(d)), "Self-host Geist (next/font with the geist package in Next.js).", "invinsense-typography"),
    gap("icons", "Phosphor Bold icons", /phosphor/i.test(all) || deps.some((d) => /phosphor/i.test(d)), "Replace other icon sets with @phosphor-icons/react (weight=\"bold\").", "invinsense-icons"),
    gap("shell", "One shell: 262px sidebar, 58px topbar, fixed control order", /sidebar-w|262px/.test(all) && /topbar/i.test(all), "Rebuild the layout on the shared shell (scaffold_invinsense_project shows the reference).", "invinsense-principles"),
    gap("nav-links", "Navigation is links with aria-current", /aria-current/.test(all), "Use <a href> / next/link with aria-current='page' derived from the route.", "invinsense-navigation"),
    gap("states", "Four states (loading, empty, error, partial)", /skeleton/i.test(all) && /empty/i.test(all) && /correlation/i.test(all), "Add skeleton, empty (with next action), error (correlation ID + retry) and partial states to every fetching view.", "invinsense-four-states"),
    gap("tour", "Guided tour (nextstepjs 2.2.0)", /nextstepjs|tour/i.test(all) || deps.includes("nextstepjs"), "Add a specific, replayable tour that auto-starts once.", "invinsense-tour"),
    gap("reduced-motion", "prefers-reduced-motion block", /prefers-reduced-motion/.test(all), "Add the block last in the stylesheet.", "invinsense-motion-a11y"),
    gap("charts", "reaviz for charts", !deps.some((d) => /recharts|chart\.js|apexcharts|highcharts|victory|nivo/.test(d)) , "Move charts to reaviz; keep recharts only where it already works.", "invinsense-charts"),
  ];
  return gaps;
}
