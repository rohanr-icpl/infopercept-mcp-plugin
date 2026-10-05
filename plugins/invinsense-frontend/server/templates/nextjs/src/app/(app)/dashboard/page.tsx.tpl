import type { Metadata } from "next";
import { Overview } from "@/components/dashboard/Overview";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Fetch on the server, in parallel, close to where the data is used, then pass it to <Overview />.
  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <Overview />
    </div>
  );
}
