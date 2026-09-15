import Link from "next/link";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: { href: string; label: string };
}) {
  return (
    <header className="mb-6">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="text-[13px] font-medium text-mute transition hover:text-ink"
        >
          {breadcrumb.label}
        </Link>
      )}
      <div className={`flex items-start justify-between gap-4 ${breadcrumb ? "mt-2" : ""}`}>
        <h1 className="min-w-0 text-[24px] font-semibold leading-tight tracking-[-0.03em]">
          {title}
        </h1>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {description && (
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-mute">{description}</p>
      )}
    </header>
  );
}
