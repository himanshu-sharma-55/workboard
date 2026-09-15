"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Pill } from "@/components/Pill";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/Spinner";
import {
  ASK_STATUS_LABELS,
  ASK_TYPE_LABELS,
  REQUEST_TYPES,
  REQUEST_TYPE_HINTS,
  REQUEST_TYPE_LABELS,
  type RequestType,
} from "@/lib/constants";
import { cn } from "@/lib/cn";

type Member = { id: string; name: string };
type Ask = {
  id: string;
  type: string;
  toUserId: string;
  toUserName: string;
  fromUserId?: string;
  fromUserName: string;
  note: string;
  status: string;
};

const TYPE_TONE: Record<string, string> = {
  check: "bg-info-soft text-info",
  discuss: "bg-accent-soft text-accent-deep",
  approve: "bg-warn-soft text-warn",
};

const STATUS_TONE: Record<string, string> = {
  pending: "text-warn",
  done: "text-ok",
  declined: "text-mute",
};

function TypeChip({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        TYPE_TONE[type] ?? "bg-paper-2 text-ink-soft"
      )}
    >
      {ASK_TYPE_LABELS[type as keyof typeof ASK_TYPE_LABELS] ?? type}
    </span>
  );
}

function RequestRow({
  ask,
  currentUserId,
  muted,
  onRespond,
}: {
  ask: Ask;
  currentUserId?: string;
  muted?: boolean;
  onRespond: (askId: string, status: "done" | "declined") => Promise<void>;
}) {
  const mine = ask.toUserId === currentUserId;
  const waiting = ask.status === "pending";

  return (
    <li className={cn("flex items-start gap-2.5 py-2.5", muted && "opacity-70")}>
      <Avatar name={ask.toUserName} size="xs" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[13px] font-medium leading-snug text-ink">
            {ask.toUserName}
          </p>
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium",
              STATUS_TONE[ask.status] ?? "text-mute"
            )}
          >
            {waiting ? "Waiting" : ASK_STATUS_LABELS[ask.status] ?? ask.status}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <TypeChip type={ask.type} />
          <span className="text-[11px] text-mute">from {ask.fromUserName}</span>
        </div>
        {ask.note && <p className="mt-1 text-[12px] leading-snug text-ink-soft">{ask.note}</p>}
        {waiting && mine && (
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={() => onRespond(ask.id, "done")}
              className="wb-link-action wb-link-action-ok"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => onRespond(ask.id, "declined")}
              className="wb-link-action wb-link-action-danger"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function AssignmentPanel({
  ownerId,
  members,
  asks,
  currentUserId,
  onAssign,
  onRequest,
  onRespond,
}: {
  ownerId: string | null;
  ownerName: string | null;
  members: Member[];
  asks: Ask[];
  currentUserId?: string;
  onAssign: (ownerId: string | null) => Promise<void>;
  onRequest: (opts: { type: RequestType; toUserId: string; note: string }) => Promise<void>;
  onRespond: (askId: string, status: "done" | "declined") => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [reqTo, setReqTo] = useState("");
  const [reqType, setReqType] = useState<RequestType>("check");
  const [reqNote, setReqNote] = useState("");
  const [adding, setAdding] = useState(false);

  const pending = asks.filter((a) => a.status === "pending" && a.type !== "own");
  const closed = asks
    .filter((a) => a.status !== "pending" && a.type !== "own")
    .slice(-3)
    .reverse();
  const others = members.filter((m) => m.id !== ownerId);

  async function assign(id: string) {
    setSaving(true);
    try {
      await onAssign(id === "__none__" ? null : id);
    } finally {
      setSaving(false);
    }
  }

  async function sendRequest() {
    if (!reqTo) return;
    setSaving(true);
    try {
      await onRequest({ type: reqType, toUserId: reqTo, note: reqNote.trim() });
      setReqNote("");
      setReqTo("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wb-panel p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
        Assignment
      </p>

      <div className="mt-4">
        <p className="text-[13px] font-semibold text-ink">Owner</p>
        <p className="mt-0.5 text-[12px] leading-snug text-mute">
          One person accountable for delivering this item.
        </p>
        <div className="mt-2">
          <Select
            ariaLabel="Owner"
            value={ownerId ?? "__none__"}
            onValueChange={assign}
            options={[
              { value: "__none__", label: "Unassigned" },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-[13px] font-semibold text-ink">
            Requests
            {pending.length > 0 && (
              <span className="ml-1.5 font-medium text-mute">{pending.length}</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="wb-link-action"
          >
            {adding ? (
              "Cancel"
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Request
              </>
            )}
          </button>
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-mute">
          Review, discuss, or approve — not ownership.
        </p>

        {adding && (
          <div className="mt-3 space-y-2 rounded-lg bg-paper p-3">
            <p className="text-[11px] font-medium text-mute">Need them to</p>
            <div className="flex flex-wrap gap-1">
              {REQUEST_TYPES.map((t) => (
                <Pill key={t} active={reqType === t} onClick={() => setReqType(t)} className="!px-2.5 !py-1 text-xs">
                  {REQUEST_TYPE_LABELS[t]}
                </Pill>
              ))}
            </div>
            <p className="text-[11px] text-mute">{REQUEST_TYPE_HINTS[reqType]}</p>
            <Select
              ariaLabel="Person to ask"
              value={reqTo}
              onValueChange={setReqTo}
              placeholder="Choose a person"
              options={(others.length ? others : members).map((m) => ({
                value: m.id,
                label: m.name,
              }))}
            />
            <input
              value={reqNote}
              onChange={(e) => setReqNote(e.target.value)}
              placeholder="Optional note"
              className="wb-input"
            />
            <button
              type="button"
              disabled={!reqTo || saving}
              onClick={sendRequest}
              className="wb-btn wb-btn-primary wb-btn-sm"
            >
              {saving ? <Spinner size="sm" light /> : null}
              Send request
            </button>
          </div>
        )}

        {pending.length === 0 && closed.length === 0 && !adding && (
          <p className="mt-3 text-[12px] text-mute">No requests yet.</p>
        )}

        {pending.length > 0 && (
          <ul className="mt-1 divide-y divide-line">
            {pending.map((a) => (
              <RequestRow key={a.id} ask={a} currentUserId={currentUserId} onRespond={onRespond} />
            ))}
          </ul>
        )}

        {closed.length > 0 && (
          <ul className={cn("divide-y divide-line", pending.length > 0 && "border-t border-line")}>
            {closed.map((a) => (
              <RequestRow key={a.id} ask={a} currentUserId={currentUserId} muted onRespond={onRespond} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
