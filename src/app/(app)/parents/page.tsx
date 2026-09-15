"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/EmptyState";
import { InlineError } from "@/components/InlineError";
import { InvolvedStack } from "@/components/InvolvedStack";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { ListSkeleton, Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

type ParentRow = {
  id: string;
  name: string;
  description: string;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    openIssues: number;
    waiting?: number;
    involved?: { id: string; name: string; kind: "owner" | "waiting"; waitLabel?: string }[];
  };
};

export default function ParentsPage() {
  const { data: session } = useSession();
  const { push: toast } = useToast();
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/parents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setParents(data.parents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          description: fd.get("description"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOpen(false);
      e.currentTarget.reset();
      toast("Account created");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Accounts"
        description="Clients, demos, and launches. Open one to add work items."
        actions={
          <button type="button" onClick={() => setOpen(true)} className="wb-btn wb-btn-primary">
            New account
          </button>
        }
      />

      <Modal open={open} title="New account" onClose={() => setOpen(false)}>
        <form onSubmit={onCreate} className="space-y-3">
          <input name="name" required placeholder="Name — e.g. Dell" className="wb-input" />
          <input name="description" placeholder="Short description (optional)" className="wb-input" />
          <InlineError message={error} />
          <button type="submit" disabled={saving} className="wb-btn wb-btn-primary">
            {saving ? <Spinner size="sm" light /> : null}
            Create account
          </button>
        </form>
      </Modal>

      {!open && error && (
        <div className="mb-4">
          <InlineError message={error} />
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : parents.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Create a client, demo, or launch — then add work items underneath."
          action={{ label: "New account", onClick: () => setOpen(true) }}
        />
      ) : (
        <ul className="wb-panel divide-y divide-line overflow-hidden">
          {parents.map((p) => {
            const stats = p.stats ?? { total: 0, byStatus: {}, openIssues: 0 };
            const total = stats.total || 0;
            const blocked = stats.byStatus?.blocked ?? 0;
            const done = stats.byStatus?.done ?? 0;
            const active = Math.max(0, total - done);
            const donePct = total ? Math.round((done / total) * 100) : 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/parents/${p.id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-paper"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold tracking-tight group-hover:text-accent-deep">
                      {p.name}
                    </div>
                    {p.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{p.description}</p>
                    )}
                    <div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-paper-2">
                      <div
                        className="h-full rounded-full bg-ok"
                        style={{ width: `${donePct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                      <span>{total} items</span>
                      <span>{active} open</span>
                      {blocked > 0 && <span className="font-medium text-danger">{blocked} blocked</span>}
                      {(stats.waiting ?? 0) > 0 && (
                        <span className="font-medium text-warn">{stats.waiting} waiting</span>
                      )}
                      {stats.openIssues > 0 && (
                        <span className="font-medium text-danger">
                          {stats.openIssues} issue{stats.openIssues === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <InvolvedStack people={stats.involved ?? []} currentUserId={session?.user?.id} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
