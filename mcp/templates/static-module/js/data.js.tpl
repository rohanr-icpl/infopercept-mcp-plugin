/* Navigation model and mock data. Replace mock data with API calls.
   Every nav target is a real link (Law 12). One nesting level maximum. */
var PRODUCT = { id: "__ID__", name: "__PRODUCT_NAME__", family: "__FAMILY_ID__", familyName: "__FAMILY_NAME__", multiTenant: __MULTI_TENANT__ };

var FAMILIES = __FAMILIES_JSON__;

var NAV = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "squares-four", href: "#/dashboard" },
      { id: "items", label: "Items", icon: "table", href: "#/items", children: [
        { id: "items-failed", label: "Failed", href: "#/items?filter=failed" }
      ] }
    ]
  }
];

var MOCK = {
  kpis: [
    { label: "Events today", value: "1,284,390", sub: "Up 4.2% on yesterday" },
    { label: "Active sources", value: "42", sub: "3 degraded" },
    { label: "Open cases", value: "17", sub: "2 need action" }
  ],
  series: [12, 18, 15, 22, 30, 26, 34, 31, 40, 38, 46, 52],
  items: [
    { id: "ITM-1042", name: "Perimeter firewall", status: "ok", statusLabel: "Healthy", events: 482113, seen: "2 minutes ago" },
    { id: "ITM-1043", name: "Domain controller", status: "degraded", statusLabel: "Degraded", events: 120934, seen: "9 minutes ago" },
    { id: "ITM-1044", name: "VPN gateway", status: "error", statusLabel: "Failing", events: 0, seen: "3 hours ago" },
    { id: "ITM-1045", name: "Web proxy", status: "idle", statusLabel: "Idle", events: 0, seen: "1 day ago" }
  ]
};
