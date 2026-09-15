import mongoose from "mongoose";
import { Notification } from "@/models/Notification";
import { extractMentionedUserIds, type MentionMember } from "@/lib/mentions";

export async function notifyMentions(opts: {
  workspaceId: string;
  actorId: string;
  actorName: string;
  packetId: string;
  parentId?: string;
  packetTitle: string;
  body: string;
  members: MentionMember[];
}) {
  const ids = extractMentionedUserIds(opts.body, opts.members, opts.actorId);
  if (ids.length === 0) return;

  const docs = ids.map((userId) => ({
    workspaceId: new mongoose.Types.ObjectId(opts.workspaceId),
    userId: new mongoose.Types.ObjectId(userId),
    actorId: new mongoose.Types.ObjectId(opts.actorId),
    packetId: new mongoose.Types.ObjectId(opts.packetId),
    parentId: opts.parentId ? new mongoose.Types.ObjectId(opts.parentId) : undefined,
    kind: "mention" as const,
    message: `${opts.actorName} mentioned you on ${opts.packetTitle}`,
    snippet: opts.body.slice(0, 160),
    href: `/packets/${opts.packetId}`,
    readAt: null,
  }));

  await Notification.insertMany(docs);
}

export async function notifyAsk(opts: {
  workspaceId: string;
  actorId: string;
  actorName: string;
  toUserId: string;
  packetId: string;
  parentId?: string;
  packetTitle: string;
  askType: string;
  note?: string;
}) {
  if (opts.toUserId === opts.actorId) return;

  const typeLabel: Record<string, string> = {
    own: "own",
    check: "review",
    discuss: "discuss",
    approve: "approve",
  };

  await Notification.create({
    workspaceId: new mongoose.Types.ObjectId(opts.workspaceId),
    userId: new mongoose.Types.ObjectId(opts.toUserId),
    actorId: new mongoose.Types.ObjectId(opts.actorId),
    packetId: new mongoose.Types.ObjectId(opts.packetId),
    parentId: opts.parentId ? new mongoose.Types.ObjectId(opts.parentId) : undefined,
    kind: "ask",
    message:
      opts.askType === "own"
        ? `${opts.actorName} assigned you as owner · ${opts.packetTitle}`
        : `${opts.actorName} requested you to ${typeLabel[opts.askType] ?? opts.askType} · ${opts.packetTitle}`,
    snippet: opts.note?.slice(0, 160) || undefined,
    href: `/packets/${opts.packetId}`,
    readAt: null,
  });
}

export async function notifyActivity(opts: {
  workspaceId: string;
  actorId: string;
  toUserId: string;
  packetId: string;
  parentId?: string;
  message: string;
  snippet?: string;
}) {
  if (opts.toUserId === opts.actorId) return;
  await Notification.create({
    workspaceId: new mongoose.Types.ObjectId(opts.workspaceId),
    userId: new mongoose.Types.ObjectId(opts.toUserId),
    actorId: new mongoose.Types.ObjectId(opts.actorId),
    packetId: new mongoose.Types.ObjectId(opts.packetId),
    parentId: opts.parentId ? new mongoose.Types.ObjectId(opts.parentId) : undefined,
    kind: "activity",
    message: opts.message,
    snippet: opts.snippet?.slice(0, 160) || undefined,
    href: `/packets/${opts.packetId}`,
    readAt: null,
  });
}
