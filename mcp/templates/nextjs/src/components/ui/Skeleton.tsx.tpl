export function Skeleton({ rows = 3, height = 40 }: { rows?: number; height?: number }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height, marginBottom: 8 }} />
      ))}
    </div>
  );
}
