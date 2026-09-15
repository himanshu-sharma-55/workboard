import { STATUS_LABELS, PacketStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";

const dots: Record<PacketStatus, string> = {
  intake: "bg-mute",
  discussing: "bg-warn",
  ready: "bg-info",
  in_progress: "bg-accent",
  blocked: "bg-danger",
  done: "bg-ok",
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: PacketStatus | string;
  size?: "sm" | "md";
}) {
  const s = status as PacketStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-mute",
        size === "md" ? "text-[13px]" : "text-[12px]"
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[s] ?? "bg-mute")} />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
