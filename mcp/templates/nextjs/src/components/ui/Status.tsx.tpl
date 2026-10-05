export type Tone = "ok" | "degraded" | "error" | "offline" | "idle" | "pending";

/* Law 7: status is never colour alone. Dot beside a word. */
export function Status({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`status ${tone}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}
