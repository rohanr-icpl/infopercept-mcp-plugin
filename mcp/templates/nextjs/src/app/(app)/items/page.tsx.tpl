import type { Metadata } from "next";
import { Status, type Tone } from "@/components/ui/Status";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export const metadata: Metadata = { title: "Items" };

type Item = { id: string; name: string; tone: Tone; toneLabel: string; events: number; seen: string };

async function getItems(): Promise<{ rows: Item[]; unavailable: string[] }> {
  await new Promise((r) => setTimeout(r, 600)); // replace with your data-access layer
  return {
    rows: [
      { id: "ITM-1042", name: "Perimeter firewall", tone: "ok", toneLabel: "Healthy", events: 482113, seen: "2 minutes ago" },
      { id: "ITM-1043", name: "Domain controller", tone: "degraded", toneLabel: "Degraded", events: 120934, seen: "9 minutes ago" },
      { id: "ITM-1044", name: "VPN gateway", tone: "error", toneLabel: "Failing", events: 0, seen: "3 hours ago" },
      { id: "ITM-1045", name: "Web proxy", tone: "idle", toneLabel: "Idle", events: 0, seen: "1 day ago" },
    ],
    unavailable: [],
  };
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ filter?: string; state?: string }> }) {
  const { filter, state } = await searchParams;

  // Preview states with /items?state=empty|error|partial
  if (state === "error") return <div className="page"><h1 className="page-title">Items</h1><ErrorState what="Items did not load" correlationId="req-3f9a1c2e" /></div>;

  const data = await getItems();
  const rows = filter === "failed" ? data.rows.filter((r) => r.tone === "error") : data.rows;
  const unavailable = state === "partial" ? ["Audit log source"] : data.unavailable;

  if (state === "empty" || rows.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Items</h1>
        <EmptyState title="No items yet" why="Items appear here after a source sends its first event." action={<button className="btn primary sm" type="button">Add a source</button>} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Items</h1>
      <div className="card">
        {unavailable.length ? (
          <p style={{ marginBottom: 12 }}><Status tone="degraded" label={`Some sources are unavailable: ${unavailable.join(", ")}. Showing what arrived.`} /></p>
        ) : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Name</th><th>ID</th><th>Status</th><th className="r">Events</th><th>Last seen</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="mono">{r.id}</td>
                  <td><Status tone={r.tone} label={r.toneLabel} /></td>
                  <td className="r">{r.events.toLocaleString("en-US")}</td>
                  <td>{r.seen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
