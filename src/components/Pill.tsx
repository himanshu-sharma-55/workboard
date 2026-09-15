"use client";

import { cn } from "@/lib/cn";

export function Pill({
  active,
  onClick,
  children,
  count,
  className = "",
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition",
        active
          ? "bg-ink text-white hover:bg-ink hover:text-white"
          : "bg-surface text-ink-soft ring-1 ring-line hover:bg-paper-2 hover:text-ink",
        className
      )}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={cn(
            "ml-1.5 tabular-nums",
            active ? "text-white/75" : "text-mute"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
