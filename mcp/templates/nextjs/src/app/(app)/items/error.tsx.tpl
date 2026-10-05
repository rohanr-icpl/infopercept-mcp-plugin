"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function ItemsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <h1 className="page-title">Items</h1>
      <ErrorState what="Items did not load" correlationId={error.digest ?? "unavailable"} onRetry={reset} />
    </div>
  );
}
