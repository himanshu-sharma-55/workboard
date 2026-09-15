const tones = {
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  mute: "bg-paper-2 text-ink-soft",
  accent: "bg-accent-soft text-accent-deep",
  ok: "bg-ok-soft text-ok",
} as const;

export function CountBadge({
  count,
  tone,
  label,
  hideIfZero = true,
}: {
  count: number;
  tone: keyof typeof tones;
  label: string;
  hideIfZero?: boolean;
}) {
  if (hideIfZero && count <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      <span className="tabular-nums">{count}</span>
      <span>{label}</span>
    </span>
  );
}
