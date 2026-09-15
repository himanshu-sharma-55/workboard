"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/EmptyState";
import { InlineError } from "@/components/InlineError";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SignalStrip } from "@/components/SignalStrip";
import { ListSkeleton, Skeleton, Spinner } from "@/components/Spinner";
import { WorkRow } from "@/components/WorkRow";
import { useToast } from "@/components/Toast";

type PacketRow = {
  id: string;
  title: string;
  intent: string;
  status: string;
  ownerName: string | null;
  openIssues: number;
  pendingAsks: number;
  waitingOnNames?: string[];
  waitingHint?: string | null;
  involved?: { id: string; name: string; kind: "owner" | "waiting"; waitLabel?: string }[];
  issueHint?: string | null;
  activity?: string;
};

export default function ParentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { push: toast } = useToast();
  const [parent, setParent] = useState<{ id: string; name: string; description: string } | null>(
    null
  );
  const [packets, setPackets] = useState<PacketRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/parents/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setParent(data.parent);
      setPackets(data.packets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setParent(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const totals = useMemo(() => {
    return {
      openIssues: packets.reduce((n, p) => n + (p.openIssues || 0), 0),
      pendingAsks: packets.reduce((n, p) => n + (p.pendingAsks || 0), 0),
      blocked: packets.filter((p) => p.status === "blocked").length,
    };
  }, [packets]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/parents/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          intent: fd.get("intent"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOpen(false);
      e.currentTarget.reset();
      toast("Work item created");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-8 w-48 rounded-xl" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <EmptyState
          title="Account not found"
          description={error || "It may have been removed."}
          action={{ href: "/parents", label: "Back to accounts" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        breadcrumb={{ href: "/parents", label: "Accounts" }}
        title={parent.name}
        description={parent.description || undefined}
        actions={
          <button type="button" onClick={() => setOpen(true)} className="wb-btn wb-btn-primary">
            Add work item
          </button>
        }
      />

      <SignalStrip
        status={totals.blocked > 0 ? "blocked" : undefined}
        openIssues={totals.openIssues}
        pendingAsks={totals.pendingAsks}
      />

      <Modal open={open} title="Add work item" onClose={() => setOpen(false)}>
        <form onSubmit={onCreate} className="space-y-3">
          <input
            name="title"
            required
            placeholder="Title — e.g. Dell demo request"
            className="wb-input"
          />
          <textarea
            name="intent"
            rows={3}
            placeholder="Objective — what does done look like?"
            className="wb-input"
          />
          <InlineError message={error} />
          <button type="submit" disabled={saving} className="wb-btn wb-btn-primary">
            {saving ? <Spinner size="sm" light /> : null}
            Create work item
          </button>
        </form>
      </Modal>

      {!open && error && (
        <div className="mb-4 mt-4">
          <InlineError message={error} />
        </div>
      )}

      <div className={totals.openIssues || totals.pendingAsks || totals.blocked ? "mt-6" : "mt-4"}>
        {packets.length === 0 ? (
          <EmptyState
            title="No work items yet"
            description="Add the request you discussed — context stays on the item."
            action={{ label: "Add work item", onClick: () => setOpen(true) }}
          />
        ) : (
          <ul className="wb-panel divide-y divide-line overflow-hidden">
            {packets.map((p) => (
              <li key={p.id}>
                <WorkRow
                  href={`/packets/${p.id}`}
                  title={p.title}
                  status={p.status}
                  ownerName={p.ownerName}
                  openIssues={p.openIssues}
                  pendingAsks={p.pendingAsks}
                  subtitle={p.intent || undefined}
                  activity={p.activity}
                  waitingOn={p.waitingOnNames?.length ? p.waitingOnNames.join(", ") : null}
                  waitingHint={p.waitingHint}
                  issueHint={p.issueHint}
                  involved={p.involved ?? []}
                  currentUserId={session?.user?.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
