import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main className="auth-panel">
      <EmptyState
        title="Page not found"
        why="This address does not match a page in __PRODUCT_NAME__."
        action={<Link className="btn sm" href="/dashboard">Go to dashboard</Link>}
      />
    </main>
  );
}
