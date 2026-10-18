"use client";

import { KpiCard } from "invin-uix/ui/kpi-card";
import { Badge } from "invin-uix/ui/badge";
import { DataTable, type ColumnDef } from "invin-uix/ui/data-table";
import { AreaChart, BarChart, DonutChart, GaugeChart } from "invin-uix/ui/chart";
import { Status, type Tone } from "@/components/ui/Status";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  casesByCategory,
  coverageScore,
  eventVolume,
  kpis,
  recentEvents,
  sourceHealth,
  type EventRow,
} from "@/lib/overview-data";

const statusLabel: Record<EventRow["status"], string> = { ok: "Healthy", degraded: "Degraded", error: "Failing" };
const severityVariant = { critical: "destructive", high: "destructive", medium: "warning", low: "secondary" } as const;

const columns: ColumnDef<EventRow>[] = [
  { id: "source", header: "Source", accessor: "source", sortable: true },
  { id: "summary", header: "Event", accessor: "summary", sortable: true },
  {
    id: "severity",
    header: "Severity",
    accessor: "severity",
    sortable: true,
    cell: ({ row }) => <Badge variant={severityVariant[row.severity]}>{row.severity}</Badge>,
  },
  {
    id: "status",
    header: "Status",
    accessor: "status",
    sortable: true,
    cell: ({ row }) => <Status tone={row.status as Tone} label={statusLabel[row.status]} />,
  },
  { id: "seen", header: "Seen", accessor: "seen", sortable: true, align: "right" },
];

/* Built from invin-uix so charts, KPI cards and tables match every other Invinsense module.
   Charts read var(--primary) and the severity tokens; never pass hex. */
export function Overview() {
  return (
    <>
      <div className="kpi-grid" id="kpi-grid">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="chart-grid">
        <section className="card" aria-labelledby="h-health">
          <h2 id="h-health">Source health</h2>
          <DonutChart data={sourceHealth} height={240} showLegend />
        </section>
        <section className="card" aria-labelledby="h-volume">
          <h2 id="h-volume">Event volume, last 7 days (thousands)</h2>
          <AreaChart data={eventVolume} xKey="day" areas={[{ key: "events", name: "Events", color: "var(--primary)" }]} height={240} />
        </section>
        <section className="card" aria-labelledby="h-cases">
          <h2 id="h-cases">Open cases by category</h2>
          <BarChart data={casesByCategory} xKey="category" bars={[{ key: "cases", name: "Open cases", color: "var(--primary)" }]} horizontal height={240} />
        </section>
        <section className="card" aria-labelledby="h-coverage">
          <h2 id="h-coverage">Coverage</h2>
          <GaugeChart value={coverageScore} max={100} label="Coverage" color="var(--primary)" height={240} />
        </section>
      </div>

      <section className="card" aria-labelledby="h-recent">
        <h2 id="h-recent">Recent events</h2>
        <DataTable<EventRow>
          columns={columns}
          data={recentEvents}
          rowKey="id"
          searchable
          searchPlaceholder="Search sources or events"
          paginated
          pageSize={5}
          stickyHeader
          emptyState={<EmptyState title="No events yet" why="Events appear here after a source sends its first record." />}
        />
      </section>
    </>
  );
}
