"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { PACKET_STATUSES, STATUS_LABELS, type PacketStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";

const dots: Record<PacketStatus, string> = {
  intake: "bg-mute",
  discussing: "bg-warn",
  ready: "bg-info",
  in_progress: "bg-accent",
  blocked: "bg-danger",
  done: "bg-ok",
};

export function StatusMenu({
  status,
  onChange,
}: {
  status: string;
  onChange: (status: PacketStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const s = status as PacketStatus;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium transition hover:border-line-strong hover:bg-paper-2"
      >
        <span className={cn("h-2 w-2 rounded-full", dots[s] ?? "bg-mute")} />
        {STATUS_LABELS[s] ?? status}
        <ChevronDown className="h-3.5 w-3.5 text-mute" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 z-40 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            {PACKET_STATUSES.map((st) => (
              <li key={st}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(st);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-ink hover:bg-paper-2 hover:text-ink ${
                    st === s ? "bg-paper-2 font-medium" : ""
                  }`}
                >
                  <span className={cn("h-2 w-2 rounded-full", dots[st])} />
                  <span className="flex-1 text-left">{STATUS_LABELS[st]}</span>
                  {st === s && <Check className="h-3.5 w-3.5 text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
