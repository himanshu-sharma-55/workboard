import { CountBadge } from "@/components/CountBadge";
import { StatusBadge } from "@/components/StatusBadge";

export function SignalStrip({
  status,
  openIssues = 0,
  pendingAsks = 0,
}: {
  status?: string;
  openIssues?: number;
  pendingAsks?: number;
}) {
  const blocked = status === "blocked";
  if (!blocked && openIssues <= 0 && pendingAsks <= 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {blocked && <StatusBadge status="blocked" size="md" />}
      <CountBadge count={openIssues} tone="danger" label={openIssues === 1 ? "issue" : "issues"} />
      <CountBadge count={pendingAsks} tone="warn" label={pendingAsks === 1 ? "request" : "requests"} />
    </div>
  );
}
