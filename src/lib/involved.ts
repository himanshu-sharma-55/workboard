import { ASK_TYPE_LABELS, type AskType } from "@/lib/constants";

export type InvolvedPerson = {
  id: string;
  name: string;
  kind: "owner" | "waiting";
  waitLabel?: string;
};

function asId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value || null;
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const s = String((value as { toString: () => string }).toString());
    if (!s || s === "[object Object]") return null;
    return s;
  }
  return null;
}

type AskLike = {
  status?: string;
  type?: string;
  toUserId?: unknown;
  toUserName?: string;
};

export function involvedFromPacket(
  packet: {
    ownerId?: unknown;
    asks?: AskLike[] | null;
  },
  userMap: Record<string, string>
): InvolvedPerson[] {
  const people: InvolvedPerson[] = [];
  const seen = new Set<string>();
  const ownerId = asId(packet.ownerId);
  if (ownerId) {
    people.push({
      id: ownerId,
      name: userMap[ownerId] ?? "Owner",
      kind: "owner",
    });
    seen.add(ownerId);
  }
  for (const ask of packet.asks ?? []) {
    if (!ask || ask.status !== "pending" || ask.type === "own") continue;
    const id = asId(ask.toUserId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const typeLabel = ASK_TYPE_LABELS[ask.type as AskType] ?? ask.type ?? "Request";
    people.push({
      id,
      name: userMap[id] ?? "Someone",
      kind: "waiting",
      waitLabel: typeLabel,
    });
  }
  return people;
}

export function waitingHint(asks: AskLike[] | null | undefined) {
  const pending = (asks ?? []).filter(
    (a) => a && a.status === "pending" && a.type !== "own" && asId(a.toUserId)
  );
  const labels = [
    ...new Set(
      pending.map((a) => (ASK_TYPE_LABELS[a.type as AskType] ?? a.type ?? "request").toLowerCase())
    ),
  ];
  if (labels.length === 1) return labels[0];
  return null;
}

export function firstOpenIssueTitle(
  issues: { status?: string; title?: string }[] | null | undefined
) {
  return issues?.find((i) => i?.status === "open")?.title ?? null;
}

export function pendingAsksOf(asks: AskLike[] | null | undefined) {
  return (asks ?? []).filter(
    (a) => a && a.status === "pending" && a.type !== "own" && asId(a.toUserId)
  );
}

export function waitingOnNames(asks: AskLike[] | null | undefined, userMap: Record<string, string>) {
  return [
    ...new Set(
      pendingAsksOf(asks)
        .map((a) => userMap[asId(a.toUserId) ?? ""] ?? "")
        .filter(Boolean)
    ),
  ];
}

export function waitingLine(
  waitingOn: string | null | undefined,
  hint: string | null | undefined
) {
  if (!waitingOn) return null;
  return hint ? `Waiting on ${waitingOn} · ${hint}` : `Waiting on ${waitingOn}`;
}

export function cardSignals(
  packet: {
    ownerId?: unknown;
    ownerName?: string | null;
    asks?: AskLike[] | null;
  },
  currentUserId?: string
) {
  const userMap: Record<string, string> = {};
  const ownerId = asId(packet.ownerId);
  if (ownerId && packet.ownerName) userMap[ownerId] = packet.ownerName;
  for (const a of packet.asks ?? []) {
    const id = asId(a.toUserId);
    if (id && a.toUserName) userMap[id] = a.toUserName;
  }
  const involved = involvedFromPacket(packet, userMap);
  const names = waitingOnNames(packet.asks, userMap);
  const waitingOnMe = Boolean(
    currentUserId && pendingAsksOf(packet.asks).some((a) => asId(a.toUserId) === currentUserId)
  );
  return {
    involved,
    waitingOn: waitingOnMe ? "you" : names.length ? names.join(", ") : null,
    waitingHint: waitingHint(packet.asks),
  };
}
