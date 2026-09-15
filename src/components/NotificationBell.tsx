"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Note = {
  id: string;
  kind: string;
  message: string;
  snippet: string;
  href: string;
  actorName: string;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (!res.ok) return;
      setNotes(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [open, load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markRead(id: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
  }

  async function markAll() {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper-2 hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3a6 6 0 0 0-6 6v2.2c0 .7-.2 1.4-.6 2L4 16h16l-1.4-2.8c-.4-.6-.6-1.3-.6-2V9a6 6 0 0 0-6-6Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 17a2.5 2.5 0 0 0 5 0"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,340px)] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="min-w-0 truncate text-sm font-semibold tracking-tight">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="wb-link-action wb-link-action-accent">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-auto">
            {loading && notes.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-mute">Loading…</p>
            )}
            {!loading && notes.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-mute">Nothing yet</p>
            )}
            {notes.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => {
                  if (!n.read) void markRead(n.id);
                  setOpen(false);
                }}
                className={`block border-b border-line px-3 py-2.5 last:border-0 hover:bg-paper-2 ${
                  n.read ? "" : "bg-accent-soft/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium leading-snug text-ink">{n.message}</p>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-mute">{timeAgo(n.createdAt)}</span>
                </div>
                {n.snippet && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-mute">{n.snippet}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
