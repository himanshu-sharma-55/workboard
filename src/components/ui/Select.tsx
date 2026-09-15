"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  ariaLabel,
  tone,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  ariaLabel?: string;
  tone?: "default" | "danger" | "ok" | "warn";
}) {
  const toneCls =
    tone === "danger"
      ? "border-danger/25 bg-danger-soft text-danger"
      : tone === "ok"
        ? "border-ok/25 bg-ok-soft text-ok"
        : tone === "warn"
          ? "border-warn/25 bg-warn-soft text-warn"
          : "border-line bg-surface text-ink hover:bg-paper";

  return (
    <RadixSelect.Root value={value || undefined} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-[13px] font-medium outline-none transition",
          "hover:border-line-strong focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_rgba(91,84,245,0.12)]",
          toneCls
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <RadixSelect.Viewport>
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-ink outline-none data-[highlighted]:bg-paper-2 data-[highlighted]:text-ink data-[state=checked]:font-semibold"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-accent" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
