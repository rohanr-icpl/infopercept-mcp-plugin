"use client";

import { ArrowClockwise, Copy, Warning } from "@phosphor-icons/react";

/* Error: what failed in user terms, a retry, and a copyable correlation ID. Never a stack trace. */
export function ErrorState({ what, correlationId, onRetry }: { what: string; correlationId: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <Warning size={24} weight="bold" aria-hidden="true" />
      <h2>{what}</h2>
      <p>Check your connection and retry. If it keeps failing, share this ID with support.</p>
      <span className="cid">
        <code className="mono">{correlationId}</code>
        <button className="btn sm ghost" type="button" onClick={() => navigator.clipboard?.writeText(correlationId)}>
          <Copy size={16} weight="bold" aria-hidden="true" /> Copy ID
        </button>
      </span>
      {onRetry ? (
        <button className="btn sm" type="button" onClick={onRetry}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" /> Retry
        </button>
      ) : null}
    </div>
  );
}
