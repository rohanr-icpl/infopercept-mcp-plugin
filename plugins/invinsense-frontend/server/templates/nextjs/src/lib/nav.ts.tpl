export type NavIcon = "squares-four" | "table" | "gear" | "list-checks" | "shield-check" | "database" | "bell" | "user" | "chart-line" | "file-text";
export type NavItem = { id: string; label: string; href: string; icon?: NavIcon; children?: NavItem[] };
export type NavGroup = { label: string; items: NavItem[] };

/* Every nav target is a real link (Law 12). One nesting level maximum. */
export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "squares-four" },
      {
        id: "items",
        label: "Items",
        href: "/items",
        icon: "table",
        children: [{ id: "items-failed", label: "Failed", href: "/items?filter=failed" }],
      },
    ],
  },
];
