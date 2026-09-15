"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { ListSkeleton } from "@/components/Spinner";
import { WorkRow } from "@/components/WorkRow";
import { STATUS_LABELS } from "@/lib/constants";

type Item = {
  id: string;
  title: string;
  status: string;
  bucket: string;
  parentId: string;
  parentName: string;
  ownerId: string | null;
  ownerName: string | null;
  openIssues: number;
  pendingAsks: number;
  waitingOnMe: boolean;
  waitingOnNames: string[];
  waitingHint: string | null;
  involved: { id: string; name: string; kind: "owner" | "waiting"; waitLabel?: string }[];
  issueHint: string | null;
  activity: string;
  updatedAt: string;
};

type Filter =
  | "all"
  | "waiting"
  | "attention"
  | "mine"
  | "unassigned"
  | "intake"
  | "discussing"
  | "ready"
  | "in_progress"
  | "blocked"
  | "done";

function firstName(name?: string | null) {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting on me" },
  { id: "attention", label: "Needs attention" },
  { id: "mine", label: "Owned by me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "intake", label: STATUS_LABELS.intake },
  { id: "discussing", label: STATUS_LABELS.discussing },
  { id: "ready", label: STATUS_LABELS.ready },
  { id: "in_progress", label: STATUS_LABELS.in_progress },
  { id: "blocked", label: STATUS_LABELS.blocked },
  { id: "done", label: STATUS_LABELS.done },
];

const STATUS_FILTERS = new Set<Filter>([
  "intake",
  "discussing",
  "ready",
  "in_progress",
  "blocked",
  "done",
]);

function DashboardInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const personId = searchParams.get("person");
  const personNameParam = searchParams.get("name");
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        setItems(d.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const uid = session?.user?.id;

  const personName = useMemo(() => {
    if (personNameParam) return personNameParam;
    if (!personId) return null;
    for (const i of items) {
      if (i.ownerId === personId && i.ownerName) return i.ownerName;
      const hit = (i.involved ?? []).find((p) => p.id === personId);
      if (hit) return hit.name;
    }
    return "this person";
  }, [personId, personNameParam, items]);

  const scoped = useMemo(() => {
    if (!personId) return items;
    return items.filter(
      (i) =>
        i.ownerId === personId ||
        (i.involved ?? []).some((p) => p.kind === "waiting" && p.id === personId)
    );
  }, [items, personId]);

  const counts = useMemo(() => {
    return {
      all: scoped.length,
      waiting: scoped.filter((i) => i.waitingOnMe).length,
      attention: scoped.filter(
        (i) => i.bucket === "blocked" || i.openIssues > 0 || i.pendingAsks > 0
      ).length,
      mine: scoped.filter((i) => i.ownerId === uid).length,
      unassigned: scoped.filter((i) => !i.ownerId && i.bucket !== "done").length,
      intake: scoped.filter((i) => i.status === "intake").length,
      discussing: scoped.filter((i) => i.status === "discussing").length,
      ready: scoped.filter((i) => i.status === "ready").length,
      in_progress: scoped.filter((i) => i.status === "in_progress").length,
      blocked: scoped.filter((i) => i.status === "blocked").length,
      done: scoped.filter((i) => i.status === "done").length,
    };
  }, [scoped, uid]);

  useEffect(() => {
    setFilter(null);
  }, [personId]);

  useEffect(() => {
    if (loading || filter !== null) return;
    if (personId) setFilter("all");
    else if (counts.waiting > 0) setFilter("waiting");
    else if (counts.attention > 0) setFilter("attention");
    else setFilter("all");
  }, [loading, filter, personId, counts.waiting, counts.attention]);

  const active = filter ?? "all";

  const list = useMemo(() => {
    let rows = scoped;
    if (active === "waiting") rows = scoped.filter((i) => i.waitingOnMe);
    else if (active === "attention") {
      rows = scoped.filter(
        (i) => i.bucket === "blocked" || i.openIssues > 0 || i.pendingAsks > 0
      );
    } else if (active === "mine") rows = scoped.filter((i) => i.ownerId === uid);
    else if (active === "unassigned") {
      rows = scoped.filter((i) => !i.ownerId && i.bucket !== "done");
    } else if (STATUS_FILTERS.has(active)) {
      rows = scoped.filter((i) => i.status === active);
    }
    return [...rows].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [scoped, active, uid]);

  return (
    <div>
      <PageHeader
        title={`Hi ${firstName(session?.user?.name)}`}
        description="See what’s waiting on you, what’s blocked, and what just changed."
        actions={
          <Link href="/parents" className="wb-btn wb-btn-primary">
            New work item
          </Link>
        }
      />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <EmptyState title="Couldn’t load overview" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No work items yet"
          description="Create an account, then add a work item. Assign an owner so it shows up under Owned by me."
          action={{ href: "/parents", label: "Create first account" }}
        />
      ) : (
        <>
          {personId && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="rounded-md bg-paper-2 px-2 py-1 font-medium text-ink">
                {personName}’s work
              </span>
              <span className="text-mute">Owned by them, or waiting on them.</span>
              <Link href="/dashboard" className="wb-link-action">
                Clear
              </Link>
            </div>
          )}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Pill
                key={f.id}
                active={active === f.id}
                onClick={() => setFilter(f.id)}
                count={counts[f.id]}
              >
                {f.label}
              </Pill>
            ))}
          </div>

          <section className="wb-panel overflow-hidden">
            {list.length === 0 ? (
              <p className="px-5 py-14 text-center text-sm text-mute">
                {personId
                  ? `Nothing here for ${personName}.`
                  : "Nothing in this view."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((item) => (
                  <li key={item.id}>
                    <WorkRow
                      href={`/packets/${item.id}`}
                      title={item.title}
                      eyebrow={item.parentName}
                      status={item.status}
                      ownerName={item.ownerName}
                      openIssues={item.openIssues}
                      pendingAsks={item.pendingAsks}
                      activity={item.activity}
                      waitingOn={
                        item.waitingOnMe
                          ? "you"
                          : item.waitingOnNames.length
                            ? item.waitingOnNames.join(", ")
                            : null
                      }
                      waitingHint={item.waitingHint}
                      issueHint={item.issueHint}
                      involved={item.involved ?? []}
                      currentUserId={uid}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <DashboardInner />
    </Suspense>
  );
}
