"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { InlineError } from "@/components/InlineError";
import { PageHeader } from "@/components/PageHeader";
import { ListSkeleton, Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Avatar";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  owned?: number;
  blocked?: number;
  waitingOn?: number;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMembers(data.members ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOpen(false);
      e.currentTarget.reset();
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
        title="Team"
        description="Who’s on the team, what they own, and what’s waiting on them."
        actions={
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={open ? "wb-btn wb-btn-ghost" : "wb-btn wb-btn-primary"}
          >
            {open ? "Cancel" : "Add member"}
          </button>
        }
      />

      {open && (
        <form
          onSubmit={onInvite}
          className="wb-panel mb-6 grid gap-3 p-5 sm:grid-cols-3"
        >
          <input name="name" required placeholder="Full name" className="wb-input" />
          <input name="email" type="email" required placeholder="Work email" className="wb-input" />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Temporary password"
            className="wb-input"
          />
          <div className="sm:col-span-3">
            <InlineError message={error} />
          </div>
          <button type="submit" disabled={saving} className="wb-btn wb-btn-primary sm:col-span-3 sm:w-fit">
            {saving ? (
              <>
                <Spinner size="sm" light /> Adding
              </>
            ) : (
              "Add to workspace"
            )}
          </button>
        </form>
      )}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : members.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Add people so you can assign an owner, or send a review or approval request."
          action={{ label: "Add member", onClick: () => setOpen(true) }}
        />
      ) : (
        <ul className="wb-panel divide-y divide-line overflow-hidden">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/dashboard?person=${encodeURIComponent(m.id)}&name=${encodeURIComponent(m.name)}`}
                className="group flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-paper"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} />
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold tracking-tight group-hover:text-accent-deep">
                      {m.name}
                    </div>
                    <div className="truncate text-sm text-ink-soft">{m.email}</div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-[12px] text-mute">
                      <span>{m.owned ?? 0} owned</span>
                      <span>{m.waitingOn ?? 0} waiting on them</span>
                      {(m.blocked ?? 0) > 0 && (
                        <span className="font-medium text-danger">{m.blocked} blocked</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold capitalize text-accent-deep">
                  {m.role}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
