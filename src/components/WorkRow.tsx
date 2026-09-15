import Link from "next/link";
import { CountBadge } from "@/components/CountBadge";
import { InvolvedStack } from "@/components/InvolvedStack";
import { StatusBadge } from "@/components/StatusBadge";
import { waitingLine, type InvolvedPerson } from "@/lib/involved";

export function WorkRow({
  href,
  title,
  eyebrow,
  status,
  ownerName,
  openIssues = 0,
  pendingAsks = 0,
  subtitle,
  activity,
  waitingOn,
  waitingHint,
  issueHint,
  involved = [],
  currentUserId,
}: {
  href: string;
  title: string;
  eyebrow?: string;
  status: string;
  ownerName?: string | null;
  openIssues?: number;
  pendingAsks?: number;
  subtitle?: string;
  activity?: string | null;
  waitingOn?: string | null;
  waitingHint?: string | null;
  issueHint?: string | null;
  involved?: InvolvedPerson[];
  currentUserId?: string;
}) {
  const hot = status === "blocked" || openIssues > 0;
  const waitingLabel = waitingLine(waitingOn, waitingHint);

  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 px-5 py-4 transition hover:bg-paper ${
        hot ? "border-l-[3px] border-l-danger" : "border-l-[3px] border-l-transparent"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {eyebrow && <span className="text-xs font-medium text-mute">{eyebrow}</span>}
          <StatusBadge status={status} />
        </div>
        <div className="mt-1 text-[15px] font-semibold leading-snug tracking-tight group-hover:text-accent-deep">
          {title}
        </div>
        {subtitle && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{subtitle}</p>
        )}
        {activity && <p className="mt-1 truncate text-[12px] text-mute">{activity}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {involved.length === 0 && (
            <span className="text-xs text-mute">{ownerName || "Unassigned"}</span>
          )}
          {waitingLabel && (
            <span className="inline-flex max-w-full items-center truncate rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
              {waitingLabel}
            </span>
          )}
          {openIssues > 0 && (
            <span className="inline-flex max-w-[240px] truncate rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
              {openIssues === 1 ? "1 issue" : `${openIssues} issues`}
              {issueHint ? ` · ${issueHint}` : ""}
            </span>
          )}
          {!waitingLabel && (
            <CountBadge
              count={pendingAsks}
              tone="warn"
              label={pendingAsks === 1 ? "request" : "requests"}
            />
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center pt-0.5">
        <InvolvedStack people={involved} currentUserId={currentUserId} />
      </div>
    </Link>
  );
}
