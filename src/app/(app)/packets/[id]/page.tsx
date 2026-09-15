"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, ChevronRight, CircleHelp, Paperclip, Plus, Send } from "lucide-react";
import { AssignmentPanel } from "@/components/AssignmentPanel";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { InlineError } from "@/components/InlineError";
import { InvolvedStack } from "@/components/InvolvedStack";
import { MentionBody } from "@/components/MentionBody";
import { MentionComposer } from "@/components/MentionComposer";
import { Skeleton, SkeletonStack, Spinner } from "@/components/Spinner";
import { StatusMenu } from "@/components/StatusMenu";
import { useToast } from "@/components/Toast";
import { STATUS_LABELS, type PacketStatus } from "@/lib/constants";
import { cardSignals, firstOpenIssueTitle, waitingLine } from "@/lib/involved";
import { relativeTime } from "@/lib/time";

type Member = { id: string; name: string; email: string };

type Packet = {
  id: string;
  parentId: string;
  parentName: string;
  title: string;
  intent: string;
  status: string;
  ownerId: string | null;
  ownerName: string | null;
  comments: { id: string; authorName: string; body: string; createdAt: string }[];
  decisions: { id: string; text: string; madeByName: string; createdAt?: string }[];
  openQuestions: { id: string; text: string; resolved: boolean }[];
  references: { id: string; label: string; url: string; addedByName: string }[];
  issues: {
    id: string;
    title: string;
    detail: string;
    status: string;
    raisedByName: string;
  }[];
  asks: {
    id: string;
    type: string;
    toUserId: string;
    toUserName: string;
    fromUserName: string;
    note: string;
    status: string;
  }[];
  cameUps: {
    id: string;
    body: string;
    attachments: { name: string; url: string }[];
    authorName: string;
    createdAt: string;
  }[];
  timeline: {
    id: string;
    kind: string;
    message: string;
    actorName: string;
    createdAt: string;
  }[];
  updatedAt: string;
};

async function act(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/packets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data.packet as Packet;
}

export default function PacketPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { push: toast } = useToast();
  const [packet, setPacket] = useState<Packet | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"discuss" | "came_up">("discuss");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [composeBody, setComposeBody] = useState("");
  const [intent, setIntent] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const shouldScrollRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/packets/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setPacket(data.packet);
      setIntent(data.packet?.intent ?? "");
      setMembers(data.members ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
      setPacket(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) load();
  }, [params.id, load]);

  async function run(payload: Record<string, unknown>) {
    setError("");
    const next = await act(params.id, payload);
    setPacket(next);
    setIntent(next.intent ?? "");
    return next;
  }

  const feed = useMemo(() => {
    if (!packet) return [];
    const rows: {
      id: string;
      kind: "discuss" | "came_up" | "event";
      authorName: string;
      body: string;
      createdAt: string;
      attachments?: { name: string; url: string }[];
    }[] = [
      ...(packet.comments ?? []).map((c) => ({
        id: `c-${c.id}`,
        kind: "discuss" as const,
        authorName: c.authorName,
        body: c.body,
        createdAt: c.createdAt,
      })),
      ...(packet.cameUps ?? []).map((c) => ({
        id: `u-${c.id}`,
        kind: "came_up" as const,
        authorName: c.authorName,
        body: c.body,
        createdAt: c.createdAt,
        attachments: c.attachments,
      })),
      ...(packet.timeline ?? [])
        .filter((t) => t.kind !== "comment" && t.kind !== "came_up")
        .map((t) => ({
          id: `t-${t.id}`,
          kind: "event" as const,
          authorName: t.actorName,
          body: t.message,
          createdAt: t.createdAt,
        })),
    ];
    return rows.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }, [packet]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollRef.current = false;
    }
  }, [feed.length]);

  async function onCompose(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = composeBody.trim();
    if (!body) return;
    const fd = new FormData(form);
    const linkUrl = String(fd.get("linkUrl") || "").trim();
    const linkName = String(fd.get("linkName") || "").trim();
    const nextAttachments = [...attachments];
    if (mode === "came_up" && linkUrl) {
      nextAttachments.push({ name: linkName || linkUrl, url: linkUrl });
    }
    setPending(true);
    try {
      shouldScrollRef.current = true;
      if (mode === "discuss") await run({ action: "comment", body });
      else {
        await run({ action: "came_up", body, attachments: nextAttachments });
        setAttachments([]);
      }
      setComposeBody("");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAttachments((prev) => [...prev, { name: data.name, url: data.url }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-9 w-2/3 max-w-md rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <SkeletonStack rows={5} />
        </div>
      </div>
    );
  }

  if (loadError || !packet) {
    return (
      <EmptyState
        title="Couldn’t open this work item"
        description={loadError || "It may have been removed."}
        action={{ href: "/dashboard", label: "Back to overview" }}
      />
    );
  }

  const issues = packet.issues ?? [];
  const openIssues = issues.filter((i) => i.status === "open");
  const decisions = packet.decisions ?? [];
  const questions = (packet.openQuestions ?? []).filter((q) => !q.resolved);
  const references = packet.references ?? [];
  const uid = session?.user?.id;
  const { involved, waitingOn, waitingHint } = cardSignals(packet, uid);
  const waitingLabel = waitingLine(waitingOn, waitingHint);
  const issueHint = firstOpenIssueTitle(issues);

  return (
    <div>
      <nav className="flex items-center gap-1.5 text-[13px] text-mute">
        <Link href="/parents" className="rounded-md px-1 py-0.5 -mx-1 transition hover:bg-paper-2 hover:text-ink">
          Accounts
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/parents/${packet.parentId}`} className="rounded-md px-1 py-0.5 -mx-1 transition hover:bg-paper-2 hover:text-ink">
          {packet.parentName}
        </Link>
      </nav>

      <header className="mt-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em]">
              {packet.title}
            </h1>
            <StatusMenu
              status={packet.status}
              onChange={(status) =>
                run({ action: "update", status }).then(() =>
                  toast(`Status: ${STATUS_LABELS[status as PacketStatus] ?? status}`)
                )
              }
            />
          </div>
          <p className="mt-1.5 text-[13px] text-mute">
            {packet.ownerName ? `Owner ${packet.ownerName}` : "No owner yet"}
            {packet.updatedAt ? ` · Updated ${relativeTime(packet.updatedAt)}` : ""}
          </p>
          {(waitingLabel || openIssues.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {waitingLabel && (
                <span className="inline-flex max-w-full items-center truncate rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
                  {waitingLabel}
                </span>
              )}
              {openIssues.length > 0 && (
                <span className="inline-flex max-w-[280px] truncate rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                  {openIssues.length === 1 ? "1 issue" : `${openIssues.length} issues`}
                  {issueHint ? ` · ${issueHint}` : ""}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center pt-1">
          <InvolvedStack people={involved} currentUserId={uid} />
        </div>
      </header>

      <InlineError message={error} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="wb-panel flex min-h-[620px] flex-col overflow-hidden">
          <div className="flex-1 space-y-0.5 overflow-y-auto px-4 py-4">
            {feed.length === 0 && (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold">No activity yet</p>
                <p className="mt-1 max-w-xs text-sm text-mute">
                  Comments, status, requests, and decisions stay on this item so nobody has to chase Slack.
                </p>
              </div>
            )}
            {feed.map((item) =>
              item.kind === "event" ? (
                <article key={item.id} className="flex gap-3 px-1 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                  </div>
                  <p className="min-w-0 pt-1 text-[13px] leading-snug text-mute">
                    <span className="font-medium text-ink-soft">{item.authorName}</span>
                    {" · "}
                    {item.body}
                    <span> · {relativeTime(item.createdAt)}</span>
                  </p>
                </article>
              ) : (
              <article key={item.id} className="flex gap-3 rounded-2xl px-1 py-3">
                <Avatar name={item.authorName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold">{item.authorName}</span>
                    <span className="text-[12px] text-mute">
                      {item.kind === "came_up" ? "update" : "comment"} · {relativeTime(item.createdAt)}
                    </span>
                  </div>
                  <MentionBody className="mt-1 !text-[14.5px]" text={item.body} members={members} />
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.attachments.map((a, idx) => (
                        <a
                          key={`${item.id}-${idx}`}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-accent transition hover:border-accent/30 hover:bg-accent-soft"
                        >
                          <Paperclip className="h-3 w-3" />
                          {a.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
              )
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={onCompose}
            className="border-t border-line px-4 py-3"
            onKeyDown={(e) => {
              if (e.defaultPrevented) return;
              if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
                const t = e.target as HTMLElement;
                if (t.tagName === "TEXTAREA") {
                  e.preventDefault();
                  (e.currentTarget as HTMLFormElement).requestSubmit();
                }
              }
            }}
          >
            <div className="mb-2 inline-flex rounded-lg bg-paper-2 p-0.5">
              {(
                [
                  { id: "discuss", label: "Comment" },
                  { id: "came_up", label: "Update" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  mode === m.id
                    ? "bg-surface text-ink shadow-sm"
                    : "text-mute hover:bg-surface/80 hover:text-ink"
                }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-paper/40 p-3 transition focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgba(91,84,245,0.1)]">
              <MentionComposer
                members={members}
                value={composeBody}
                onChange={setComposeBody}
                required
                rows={mode === "came_up" ? 3 : 2}
                placeholder={
                  mode === "discuss" ? "Write a comment… @ to mention" : "Log an update… @ to mention"
                }
                className="w-full resize-none border-0 bg-transparent text-[15px] outline-none placeholder:text-mute"
              />
              {mode === "came_up" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium transition hover:border-line-strong hover:bg-paper-2 hover:text-ink">
                    {uploading ? <Spinner size="sm" /> : <Paperclip className="h-3.5 w-3.5" />}
                    Attach
                    <input type="file" className="hidden" disabled={uploading} onChange={onFileChange} />
                  </label>
                  <input name="linkUrl" type="url" placeholder="https://" className="h-8 min-w-[140px] flex-1 rounded-full border border-line px-3 text-xs outline-none focus:border-accent" />
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <button type="submit" disabled={pending || uploading} className="wb-btn wb-btn-primary wb-btn-sm">
                  {pending ? <Spinner size="sm" light /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </button>
              </div>
            </div>
          </form>
        </section>

        <aside className="space-y-3 lg:sticky lg:top-20">
          <AssignmentPanel
            ownerId={packet.ownerId}
            ownerName={packet.ownerName}
            members={members}
            asks={packet.asks ?? []}
            currentUserId={session?.user?.id}
            onAssign={async (ownerId) => {
              await run({ action: "update", ownerId });
              toast(ownerId ? "Owner assigned" : "Owner cleared");
            }}
            onRequest={async ({ type, toUserId, note }) => {
              await run({ action: "ask", type, toUserId, note });
              toast("Request sent");
            }}
            onRespond={async (askId, status) => {
              await run({ action: "respond_ask", askId, status });
              toast(status === "done" ? "Request completed" : "Request declined");
            }}
          />

          <Rail title="Objective">
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onBlur={() => {
                if (intent !== packet.intent) {
                  run({ action: "update", intent }).then(() => toast("Objective saved"));
                }
              }}
              rows={4}
              placeholder="What does done look like?"
              className="wb-input min-h-[96px] text-[13px] leading-relaxed"
            />
          </Rail>

          <Rail
            title="Issues"
            count={openIssues.length}
            actionLabel="Log"
            onAction={() => setShowIssue((v) => !v)}
          >
            {showIssue && (
              <form
                className="mb-2 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await run({
                    action: "issue",
                    title: String(fd.get("title")),
                    detail: String(fd.get("detail") || ""),
                  });
                  e.currentTarget.reset();
                  setShowIssue(false);
                  toast("Issue logged");
                }}
              >
                <input name="title" required placeholder="What’s blocked?" className="wb-input" />
                <button type="submit" className="wb-btn wb-btn-primary wb-btn-sm">
                  Log issue
                </button>
              </form>
            )}
            {openIssues.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 rounded-lg bg-danger-soft/50 px-2.5 py-2">
                <p className="min-w-0 text-[13px] font-medium leading-snug text-danger">{i.title}</p>
                <button
                  type="button"
                  className="wb-link-action wb-link-action-ok"
                  onClick={() => run({ action: "resolve_issue", issueId: i.id }).then(() => toast("Issue resolved"))}
                >
                  Resolve
                </button>
              </div>
            ))}
            {openIssues.length === 0 && !showIssue && (
              <p className="text-[12px] text-mute">None open.</p>
            )}
          </Rail>

          <Rail
            title="Decisions"
            count={decisions.length}
            actionLabel="Add"
            onAction={() => setShowDecision((v) => !v)}
          >
            {showDecision && (
              <form
                className="mb-1 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await run({ action: "decision", text: String(fd.get("text")) });
                  e.currentTarget.reset();
                  setShowDecision(false);
                  toast("Decision recorded");
                }}
              >
                <textarea
                  name="text"
                  required
                  rows={2}
                  placeholder="What did we decide?"
                  className="wb-input text-[13px] leading-relaxed"
                />
                <button type="submit" className="wb-btn wb-btn-primary wb-btn-sm">
                  Record
                </button>
              </form>
            )}
            {decisions.length > 0 && (
              <ul className="divide-y divide-line">
                {decisions.map((d) => (
                  <li key={d.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug text-ink">{d.text}</p>
                      <p className="mt-0.5 text-[11px] text-mute">
                        {d.madeByName}
                        {d.createdAt ? ` · ${relativeTime(d.createdAt)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {decisions.length === 0 && !showDecision && (
              <p className="text-[12px] text-mute">None recorded.</p>
            )}
          </Rail>

          <Rail
            title="Questions"
            count={questions.length}
            actionLabel="Add"
            onAction={() => setShowQuestion((v) => !v)}
          >
            {showQuestion && (
              <form
                className="mb-1 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await run({ action: "question", text: String(fd.get("text")) });
                  e.currentTarget.reset();
                  setShowQuestion(false);
                  toast("Question added");
                }}
              >
                <textarea
                  name="text"
                  required
                  rows={2}
                  placeholder="What still needs an answer?"
                  className="wb-input text-[13px] leading-relaxed"
                />
                <button type="submit" className="wb-btn wb-btn-primary wb-btn-sm">
                  Add question
                </button>
              </form>
            )}
            {questions.map((q) => (
              <div key={q.id} className="flex items-start gap-2.5 py-1">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper-2 text-mute">
                  <CircleHelp className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink">{q.text}</p>
                  <button
                    type="button"
                    className="wb-link-action mt-1"
                    onClick={() =>
                      run({ action: "resolve_question", questionId: q.id }).then(() =>
                        toast("Question resolved")
                      )
                    }
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
            {questions.length === 0 && !showQuestion && (
              <p className="text-[12px] text-mute">None open.</p>
            )}
          </Rail>

          <Rail title="Links" actionLabel="Add" onAction={() => setShowRef((v) => !v)}>
            {showRef && (
              <form
                className="mb-2 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await run({
                    action: "reference",
                    label: String(fd.get("label")),
                    url: String(fd.get("url")),
                  });
                  e.currentTarget.reset();
                  setShowRef(false);
                  toast("Link added");
                }}
              >
                <input name="label" required placeholder="Label" className="wb-input" />
                <input name="url" type="url" required placeholder="https://" className="wb-input" />
                <button type="submit" className="wb-btn wb-btn-primary wb-btn-sm">
                  Add
                </button>
              </form>
            )}
            {references.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-[13px] font-medium text-accent transition hover:text-accent-deep hover:underline"
              >
                {r.label}
              </a>
            ))}
            {references.length === 0 && !showRef && (
              <p className="text-[12px] text-mute">None yet.</p>
            )}
          </Rail>
        </aside>
      </div>
    </div>
  );
}

function Rail({
  title,
  count,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="wb-panel p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-semibold">
          {title}
          {typeof count === "number" && count > 0 && (
            <span className="ml-1.5 text-mute">{count}</span>
          )}
        </p>
        {onAction && (
          <button type="button" onClick={onAction} className="wb-link-action">
            <Plus className="h-3 w-3" />
            {actionLabel}
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
