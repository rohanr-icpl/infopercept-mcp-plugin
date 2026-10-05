/* Mock data for the overview. Replace with a server fetch (see dashboard/page.tsx). */
export type EventRow = {
  id: string;
  source: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "ok" | "degraded" | "error";
  seen: string;
};

export const kpis = [
  { label: "Events today", value: "1,284,390", description: "Across 42 sources", trend: { value: "+4.2% on yesterday", direction: "up" as const } },
  { label: "Active sources", value: "42", description: "3 degraded", trend: { value: "No change", direction: "neutral" as const } },
  { label: "Open cases", value: "17", description: "2 need action", trend: { value: "+2 today", direction: "down" as const } },
  { label: "Coverage", value: "98%", description: "Assets reporting", trend: { value: "+1% this week", direction: "up" as const } },
];

export const sourceHealth = [
  { name: "Healthy", value: 36, color: "var(--ok)" },
  { name: "Degraded", value: 3, color: "var(--warn)" },
  { name: "Failing", value: 3, color: "var(--destructive)" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const volume = [182, 176, 190, 171, 165, 158, 160];
export const eventVolume = days.map((day, i) => ({ day, events: volume[i] ?? 0 }));

export const casesByCategory = [
  { category: "Identity and access", cases: 31 },
  { category: "Network and firewall", cases: 24 },
  { category: "Endpoint", cases: 19 },
  { category: "Logging and audit", cases: 14 },
  { category: "Encryption", cases: 9 },
];

export const coverageScore = 98;

export const recentEvents: EventRow[] = [
  { id: "e1", source: "fw-edge-01", summary: "Inbound rule changed", severity: "critical", status: "error", seen: "09:12" },
  { id: "e2", source: "dc-prod-02", summary: "Password policy drift", severity: "high", status: "degraded", seen: "08:40" },
  { id: "e3", source: "web-app-14", summary: "TLS 1.0 enabled", severity: "high", status: "error", seen: "07:55" },
  { id: "e4", source: "wks-fin-221", summary: "Disk encryption off", severity: "medium", status: "degraded", seen: "Yesterday" },
  { id: "e5", source: "siem-fwd-03", summary: "Retention set to 30 days", severity: "low", status: "ok", seen: "Yesterday" },
  { id: "e6", source: "db-core-01", summary: "Remote root login", severity: "critical", status: "error", seen: "Yesterday" },
];
