export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: {
    key: string;
    label: string;
    count: number;
    tone?: "default" | "danger" | "warn";
  }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter">
      {options.map((f) => {
        const active = value === f.key;
        const alert =
          !active && f.count > 0 && (f.tone === "danger" || f.tone === "warn");
        return (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-accent text-white hover:bg-accent hover:text-white"
                : alert && f.tone === "danger"
                  ? "bg-danger-soft text-danger hover:bg-[#ffe4e8]"
                  : alert && f.tone === "warn"
                    ? "bg-warn-soft text-warn hover:bg-[#ffe9d6]"
                    : "bg-surface text-ink-soft ring-1 ring-line hover:bg-paper-2 hover:text-ink"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 tabular-nums ${
                active ? "text-white/80" : "text-mute"
              }`}
            >
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
