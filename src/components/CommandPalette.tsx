"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, FileText } from "lucide-react";

type Hit = { href: string; title: string; subtitle: string; kind: "item" | "account" };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("wb:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wb:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    Promise.all([fetch("/api/dashboard"), fetch("/api/parents")])
      .then(async ([d, p]) => {
        const dash = await d.json();
        const par = await p.json();
        const items: Hit[] = (dash.items ?? []).map(
          (i: { id: string; title: string; parentName: string }) => ({
            href: `/packets/${i.id}`,
            title: i.title,
            subtitle: i.parentName,
            kind: "item" as const,
          })
        );
        const accounts: Hit[] = (par.parents ?? []).map(
          (a: { id: string; name: string; description: string }) => ({
            href: `/parents/${a.id}`,
            title: a.name,
            subtitle: a.description || "Account",
            kind: "account" as const,
          })
        );
        setHits([...items, ...accounts]);
      })
      .catch(() => setHits([]));
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return hits.slice(0, 12);
    return hits
      .filter(
        (h) =>
          h.title.toLowerCase().includes(s) || h.subtitle.toLowerCase().includes(s)
      )
      .slice(0, 12);
  }, [hits, q]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[12vh] w-[min(560px,calc(100%-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-mute" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search work items and accounts…"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-mute"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && filtered[active]) go(filtered[active].href);
            }}
          />
          <kbd className="hidden rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] font-medium text-mute sm:inline">
            ESC
          </kbd>
        </div>
        <ul className="max-h-80 overflow-auto p-1.5">
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-mute">No matches</li>
          )}
          {filtered.map((h, i) => (
            <li key={h.href}>
              <button
                type="button"
                onClick={() => go(h.href)}
                onMouseEnter={() => setActive(i)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-ink ${
                  i === active ? "bg-paper-2" : "hover:bg-paper"
                }`}
              >
                {h.kind === "account" ? (
                  <Building2 className="h-4 w-4 text-mute" />
                ) : (
                  <FileText className="h-4 w-4 text-mute" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{h.title}</span>
                  <span className="block truncate text-xs text-mute">{h.subtitle}</span>
                </span>
                <span className="text-[11px] text-mute">
                  {h.kind === "account" ? "Account" : "Work item"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("wb:search"))}
      className="hidden items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-mute transition hover:border-line-strong hover:bg-surface hover:text-ink md:inline-flex"
      aria-label="Search"
    >
      <Search className="h-3.5 w-3.5" />
      Search
      <kbd className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-mute">⌘K</kbd>
    </button>
  );
}
