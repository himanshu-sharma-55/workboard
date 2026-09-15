export function Spinner({
  size = "md",
  label = "Loading",
  light = false,
}: {
  size?: "sm" | "md";
  label?: string;
  light?: boolean;
}) {
  const px = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm ${light ? "text-white" : "text-mute"}`}
      role="status"
    >
      <span
        className={`wb-spinner ${px} ${light ? "!border-white/30 !border-t-white" : ""}`}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({
  className = "h-14 w-full rounded-2xl",
}: {
  className?: string;
}) {
  return <div className={`wb-skeleton ${className}`} aria-hidden />;
}

export function SkeletonStack({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-[0_10px_28px_rgba(7,17,31,0.05)] backdrop-blur-sm"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-4">
          <Skeleton className="mb-2 h-3 w-24 rounded-md" />
          <Skeleton className="h-4 w-3/5 max-w-md rounded-md" />
          <Skeleton className="mt-2 h-3 w-32 rounded-md" />
        </div>
      ))}
    </div>
  );
}
