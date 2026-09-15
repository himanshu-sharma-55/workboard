import { relativeTime } from "@/lib/time";

const VERB: Record<string, string> = {
  created: "created this",
  status_change: "changed status",
  comment: "commented",
  decision: "recorded a decision",
  open_question: "asked a question",
  ask: "sent a request",
  ask_response: "responded to a request",
  reference: "added a link",
  issue_opened: "logged an issue",
  issue_resolved: "resolved an issue",
  note: "left a note",
  came_up: "posted an update",
};

export function activityLine(opts: {
  kind?: string;
  actorName?: string | null;
  at?: Date | string | null;
}) {
  const actor = opts.actorName?.trim() || "Someone";
  const verb = VERB[opts.kind ?? ""] ?? "updated this";
  const when = opts.at ? relativeTime(typeof opts.at === "string" ? opts.at : opts.at.toISOString()) : "";
  return when ? `${actor} ${verb} · ${when}` : `${actor} ${verb}`;
}
