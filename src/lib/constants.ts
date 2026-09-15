export const PACKET_STATUSES = [
  "intake",
  "discussing",
  "ready",
  "in_progress",
  "blocked",
  "done",
] as const;

export type PacketStatus = (typeof PACKET_STATUSES)[number];

export const ASK_TYPES = ["own", "check", "discuss", "approve"] as const;
export type AskType = (typeof ASK_TYPES)[number];

export const TIMELINE_KINDS = [
  "created",
  "status_change",
  "comment",
  "decision",
  "open_question",
  "ask",
  "ask_response",
  "reference",
  "issue_opened",
  "issue_resolved",
  "note",
  "came_up",
] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const STATUS_LABELS: Record<PacketStatus, string> = {
  intake: "Intake",
  discussing: "In discussion",
  ready: "Ready",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Completed",
};

export const ASK_TYPE_LABELS: Record<AskType, string> = {
  own: "Own",
  check: "Review",
  discuss: "Discuss",
  approve: "Approve",
};

/** One-off requests — ownership is assigned separately. */
export const REQUEST_TYPES = ["check", "discuss", "approve"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  check: "Review",
  discuss: "Discuss",
  approve: "Approve",
};

export const REQUEST_TYPE_HINTS: Record<RequestType, string> = {
  check: "Look this over and confirm",
  discuss: "Join the conversation",
  approve: "Sign off",
};

export const ASK_STATUS_LABELS: Record<string, string> = {
  pending: "Waiting",
  done: "Completed",
  declined: "Declined",
};

/** Zod-friendly non-empty tuples */
export const PACKET_STATUS_ENUM = PACKET_STATUSES as unknown as [
  PacketStatus,
  ...PacketStatus[],
];
export const ASK_TYPE_ENUM = ASK_TYPES as unknown as [AskType, ...AskType[]];
