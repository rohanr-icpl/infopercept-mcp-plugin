import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <h1 className="page-title">Items</h1>
      <div className="card">
        <Skeleton rows={4} height={40} />
      </div>
    </div>
  );
}
