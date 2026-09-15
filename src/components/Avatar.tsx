import { cn } from "@/lib/cn";

const FILLS = [
  "bg-[#eceef2] text-[#3f3f46]",
  "bg-[#eeedfe] text-[#4338ca]",
  "bg-[#e0f2fe] text-[#075985]",
  "bg-[#ecfdf5] text-[#065f46]",
  "bg-[#fef3c7] text-[#92400e]",
  "bg-[#fce7f3] text-[#9d174d]",
];

function fillFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 2147483647;
  return FILLS[h % FILLS.length];
}

export function Avatar({
  name,
  size = "sm",
  title,
  className = "",
}: {
  name?: string | null;
  size?: "xs" | "sm" | "md";
  title?: string;
  className?: string;
}) {
  const label = (name ?? "").trim() || "?";
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const dim =
    size === "md" ? "h-8 w-8 text-[11px]" : size === "xs" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]";

  return (
    <div
      title={title}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        dim,
        fillFor(label),
        className
      )}
      aria-hidden={!title}
    >
      {initials}
    </div>
  );
}
