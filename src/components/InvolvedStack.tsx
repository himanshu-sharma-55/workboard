import { Avatar } from "@/components/Avatar";
import type { InvolvedPerson } from "@/lib/involved";
import { cn } from "@/lib/cn";

const SHOW = 3;

export function InvolvedStack({
  people,
  currentUserId,
}: {
  people: InvolvedPerson[];
  currentUserId?: string;
}) {
  if (!people?.length) return null;
  const shown = people.slice(0, SHOW);
  const extra = people.length - shown.length;

  return (
    <div className="flex shrink-0 items-center" aria-label="People involved">
      <div className="flex">
        {shown.map((p, i) => {
          const you = p.id === currentUserId;
          const label =
            p.kind === "owner"
              ? `${you ? "You" : p.name} · Owner`
              : `${you ? "You" : p.name} · ${p.waitLabel ?? "Waiting"}`;
          return (
            <div
              key={p.id}
              className={cn("relative", i > 0 && "-ml-1.5")}
              style={{ zIndex: shown.length - i }}
              title={label}
            >
              <Avatar
                name={p.name}
                size="xs"
                className="ring-2 ring-surface"
              />
              <span
                className={cn(
                  "absolute -bottom-px -right-px h-2 w-2 rounded-full ring-2 ring-surface",
                  p.kind === "owner" ? "bg-ink" : "bg-warn"
                )}
                aria-hidden
              />
            </div>
          );
        })}
        {extra > 0 && (
          <div
            title={`${extra} more`}
            className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-paper-2 text-[10px] font-medium text-mute ring-2 ring-surface"
            style={{ zIndex: 0 }}
          >
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}
