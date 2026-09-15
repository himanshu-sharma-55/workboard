import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href?: string; onClick?: () => void; label: string };
}) {
  return (
    <div className="wb-panel px-8 py-12 text-center">
      <p className="text-[15px] font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-mute">{description}</p>
      {action &&
        (action.href ? (
          <Link href={action.href} className="wb-btn wb-btn-primary mt-6 inline-flex">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="wb-btn wb-btn-primary mt-6">
            {action.label}
          </button>
        ))}
    </div>
  );
}
