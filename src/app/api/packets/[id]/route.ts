import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { Packet, type IPacket } from "@/models/Packet";
import { User } from "@/models/User";
import { Parent } from "@/models/Parent";
import {
  ASK_TYPE_ENUM,
  ASK_TYPE_LABELS,
  ASK_STATUS_LABELS,
  PACKET_STATUS_ENUM,
  STATUS_LABELS,
  type AskType,
  type PacketStatus,
} from "@/lib/constants";
import { pushTimeline } from "@/lib/timeline";
import { notifyActivity, notifyAsk, notifyMentions } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

function serializePacket(p: IPacket, userMap: Record<string, string>, parentName: string) {
  return {
    id: p._id.toString(),
    parentId: p.parentId.toString(),
    parentName,
    title: p.title,
    intent: p.intent,
    status: p.status,
    ownerId: p.ownerId?.toString() ?? null,
    ownerName: p.ownerId ? userMap[p.ownerId.toString()] ?? null : null,
    createdBy: p.createdBy.toString(),
    comments: p.comments.map((c) => ({
      id: c._id.toString(),
      authorId: c.authorId.toString(),
      authorName: userMap[c.authorId.toString()] ?? "Unknown",
      body: c.body,
      createdAt: c.createdAt,
    })),
    decisions: p.decisions.map((d) => ({
      id: d._id.toString(),
      text: d.text,
      madeBy: d.madeBy.toString(),
      madeByName: userMap[d.madeBy.toString()] ?? "Unknown",
      createdAt: d.createdAt,
    })),
    openQuestions: p.openQuestions.map((q) => ({
      id: q._id.toString(),
      text: q.text,
      resolved: q.resolved,
      createdBy: q.createdBy.toString(),
      createdByName: userMap[q.createdBy.toString()] ?? "Unknown",
      createdAt: q.createdAt,
    })),
    references: p.references.map((r) => ({
      id: r._id.toString(),
      label: r.label,
      url: r.url,
      addedBy: r.addedBy.toString(),
      addedByName: userMap[r.addedBy.toString()] ?? "Unknown",
      createdAt: r.createdAt,
    })),
    issues: p.issues.map((i) => ({
      id: i._id.toString(),
      title: i.title,
      detail: i.detail ?? "",
      status: i.status,
      raisedBy: i.raisedBy.toString(),
      raisedByName: userMap[i.raisedBy.toString()] ?? "Unknown",
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt ?? null,
    })),
    asks: (p.asks ?? []).map((a) => ({
      id: a._id.toString(),
      type: a.type,
      toUserId: a.toUserId.toString(),
      toUserName: userMap[a.toUserId.toString()] ?? "Unknown",
      fromUserId: a.fromUserId.toString(),
      fromUserName: userMap[a.fromUserId.toString()] ?? "Unknown",
      note: a.note ?? "",
      status: a.status,
      createdAt: a.createdAt,
      respondedAt: a.respondedAt ?? null,
    })),
    cameUps: [...(p.cameUps ?? [])]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((c) => ({
        id: c._id.toString(),
        body: c.body,
        attachments: c.attachments ?? [],
        authorId: c.authorId.toString(),
        authorName: userMap[c.authorId.toString()] ?? "Unknown",
        createdAt: c.createdAt,
      })),
    timeline: [...(p.timeline ?? [])]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((t) => ({
        id: t._id.toString(),
        kind: t.kind,
        message: t.message,
        actorId: t.actorId.toString(),
        actorName: userMap[t.actorId.toString()] ?? "Unknown",
        meta: t.meta ?? {},
        createdAt: t.createdAt,
      })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function loadPacket(id: string, workspaceId: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Packet.findOne({ _id: id, workspaceId });
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const packet = await loadPacket(id, session.user.workspaceId);
    if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [users, parent] = await Promise.all([
      User.find({ workspaceId: session.user.workspaceId }).select("name email"),
      Parent.findById(packet.parentId),
    ]);
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

    return NextResponse.json({
      packet: serializePacket(packet, userMap, parent?.name ?? "Account"),
      members: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
      })),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    title: z.string().min(1).optional(),
    intent: z.string().optional(),
    status: z.enum(PACKET_STATUS_ENUM).optional(),
    ownerId: z.string().nullable().optional(),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("comment"),
    body: z.string().min(1),
  }),
  z.object({
    action: z.literal("decision"),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal("question"),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal("resolve_question"),
    questionId: z.string(),
  }),
  z.object({
    action: z.literal("reference"),
    label: z.string().min(1),
    url: z.string().url(),
  }),
  z.object({
    action: z.literal("issue"),
    title: z.string().min(1),
    detail: z.string().optional(),
  }),
  z.object({
    action: z.literal("resolve_issue"),
    issueId: z.string(),
  }),
  z.object({
    action: z.literal("ask"),
    type: z.enum(ASK_TYPE_ENUM),
    toUserId: z.string(),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("respond_ask"),
    askId: z.string(),
    status: z.enum(["done", "declined"]),
  }),
  z.object({
    action: z.literal("came_up"),
    body: z.string().min(1),
    attachments: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().min(1),
        })
      )
      .optional(),
  }),
]);

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const packet = await loadPacket(id, session.user.workspaceId);
    if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = actionSchema.parse(await req.json());
    const uid = session.user.id;
    let mentionBody: string | null = null;
    let askNotify: { toUserId: string; type: string; note?: string } | null = null;
    let activityNotify: { toUserId: string; message: string; snippet?: string } | null = null;

    switch (body.action) {
      case "update": {
        if (body.title) packet.title = body.title;
        if (body.intent !== undefined) packet.intent = body.intent;
        if (body.status && body.status !== packet.status) {
          const from = STATUS_LABELS[packet.status as PacketStatus];
          const to = STATUS_LABELS[body.status as PacketStatus];
          packet.status = body.status as PacketStatus;
          packet.timeline.push(
            pushTimeline(
              uid,
              "status_change",
              `Status · ${from} → ${to}${body.note ? ` · ${body.note}` : ""}`,
              { from, to }
            )
          );
        }
        if (body.ownerId !== undefined) {
          packet.ownerId = body.ownerId
            ? new mongoose.Types.ObjectId(body.ownerId)
            : undefined;
          if (body.ownerId) {
            const owner = await User.findById(body.ownerId);
            packet.timeline.push(
              pushTimeline(uid, "ask", `Owner set · ${owner?.name ?? "someone"}`)
            );
            askNotify = {
              toUserId: body.ownerId,
              type: "own",
              note: "You are now the owner of this work item",
            };
          }
        }
        if (body.note && !body.status) {
          packet.timeline.push(pushTimeline(uid, "note", body.note));
        }
        break;
      }
      case "comment": {
        packet.comments.push({
          _id: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(uid),
          body: body.body,
          createdAt: new Date(),
        });
        packet.timeline.push(pushTimeline(uid, "comment", `Comment · ${body.body.slice(0, 120)}`));
        if (packet.status === "intake") packet.status = "discussing";
        mentionBody = body.body;
        break;
      }
      case "decision": {
        packet.decisions.push({
          _id: new mongoose.Types.ObjectId(),
          text: body.text,
          madeBy: new mongoose.Types.ObjectId(uid),
          createdAt: new Date(),
        });
        packet.timeline.push(pushTimeline(uid, "decision", `Decision · ${body.text}`));
        break;
      }
      case "question": {
        packet.openQuestions.push({
          _id: new mongoose.Types.ObjectId(),
          text: body.text,
          resolved: false,
          createdBy: new mongoose.Types.ObjectId(uid),
          createdAt: new Date(),
        });
        packet.timeline.push(
          pushTimeline(uid, "open_question", `Open question · ${body.text}`)
        );
        break;
      }
      case "resolve_question": {
        const q = packet.openQuestions.find((x) => x._id.toString() === body.questionId);
        if (q) {
          q.resolved = true;
          packet.timeline.push(
            pushTimeline(uid, "open_question", `Resolved question · ${q.text}`)
          );
        }
        break;
      }
      case "reference": {
        packet.references.push({
          _id: new mongoose.Types.ObjectId(),
          label: body.label,
          url: body.url,
          addedBy: new mongoose.Types.ObjectId(uid),
          createdAt: new Date(),
        });
        packet.timeline.push(
          pushTimeline(uid, "reference", `Reference · ${body.label}`, { url: body.url })
        );
        break;
      }
      case "issue": {
        packet.issues.push({
          _id: new mongoose.Types.ObjectId(),
          title: body.title,
          detail: body.detail,
          status: "open",
          raisedBy: new mongoose.Types.ObjectId(uid),
          createdAt: new Date(),
        });
        packet.timeline.push(pushTimeline(uid, "issue_opened", `Issue logged · ${body.title}`));
        if (packet.status !== "blocked" && packet.status !== "done") {
          packet.status = "blocked";
          packet.timeline.push(
            pushTimeline(uid, "status_change", "Status · auto → Blocked (open issue)")
          );
        }
        if (packet.ownerId && packet.ownerId.toString() !== uid) {
          activityNotify = {
            toUserId: packet.ownerId.toString(),
            message: `${session.user.name ?? "Someone"} logged an issue · ${packet.title}`,
            snippet: body.title,
          };
        }
        break;
      }
      case "resolve_issue": {
        const issue = packet.issues.find((x) => x._id.toString() === body.issueId);
        if (issue) {
          issue.status = "resolved";
          issue.resolvedAt = new Date();
          packet.timeline.push(
            pushTimeline(uid, "issue_resolved", `Issue resolved · ${issue.title}`)
          );
          const stillOpen = packet.issues.some((i) => i.status === "open");
          if (!stillOpen && packet.status === "blocked") {
            packet.status = "in_progress";
            packet.timeline.push(
              pushTimeline(uid, "status_change", "Status · Blocked → In progress")
            );
          }
        }
        break;
      }
      case "ask": {
        const to = await User.findOne({
          _id: body.toUserId,
          workspaceId: session.user.workspaceId,
        });
        if (!to) return NextResponse.json({ error: "User not found" }, { status: 400 });
        packet.asks.push({
          _id: new mongoose.Types.ObjectId(),
          type: body.type,
          toUserId: to._id,
          fromUserId: new mongoose.Types.ObjectId(uid),
          note: body.note,
          status: "pending",
          createdAt: new Date(),
        });
        packet.timeline.push(
          pushTimeline(
            uid,
            "ask",
            `Request · ${ASK_TYPE_LABELS[body.type as AskType] ?? body.type} → ${to.name}${body.note ? ` · ${body.note}` : ""}`
          )
        );
        askNotify = { toUserId: to._id.toString(), type: body.type, note: body.note };
        break;
      }
      case "respond_ask": {
        const ask = packet.asks.find((x) => x._id.toString() === body.askId);
        if (ask) {
          ask.status = body.status;
          ask.respondedAt = new Date();
          packet.timeline.push(
            pushTimeline(
              uid,
              "ask_response",
              `Request ${ASK_STATUS_LABELS[body.status] ?? body.status} · ${ASK_TYPE_LABELS[ask.type as AskType] ?? ask.type}`
            )
          );
          const fromId = ask.fromUserId.toString();
          if (fromId !== uid) {
            const label = ASK_TYPE_LABELS[ask.type as AskType] ?? ask.type;
            activityNotify = {
              toUserId: fromId,
              message:
                body.status === "done"
                  ? `${session.user.name ?? "Someone"} completed your ${label.toLowerCase()} request · ${packet.title}`
                  : `${session.user.name ?? "Someone"} declined your ${label.toLowerCase()} request · ${packet.title}`,
              snippet: ask.note,
            };
          }
        }
        break;
      }
      case "came_up": {
        if (!packet.cameUps) packet.cameUps = [];
        const attachments = body.attachments ?? [];
        packet.cameUps.push({
          _id: new mongoose.Types.ObjectId(),
          body: body.body,
          attachments,
          authorId: new mongoose.Types.ObjectId(uid),
          createdAt: new Date(),
        });
        const attachNote =
          attachments.length > 0 ? ` · ${attachments.length} attachment(s)` : "";
        packet.timeline.push(
          pushTimeline(
            uid,
            "came_up",
            `Update · ${body.body.slice(0, 120)}${attachNote}`
          )
        );
        mentionBody = body.body;
        break;
      }
    }

    await packet.save();

    const [users, parent, actor] = await Promise.all([
      User.find({ workspaceId: session.user.workspaceId }).select("name email"),
      Parent.findById(packet.parentId),
      User.findById(uid).select("name"),
    ]);
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));
    const members = users.map((u) => ({ id: u._id.toString(), name: u.name }));

    if (mentionBody) {
      await notifyMentions({
        workspaceId: session.user.workspaceId,
        actorId: uid,
        actorName: actor?.name ?? "Someone",
        packetId: packet._id.toString(),
        parentId: packet.parentId.toString(),
        packetTitle: packet.title,
        body: mentionBody,
        members,
      });
    }
    if (askNotify) {
      await notifyAsk({
        workspaceId: session.user.workspaceId,
        actorId: uid,
        actorName: actor?.name ?? "Someone",
        toUserId: askNotify.toUserId,
        packetId: packet._id.toString(),
        parentId: packet.parentId.toString(),
        packetTitle: packet.title,
        askType: askNotify.type,
        note: askNotify.note,
      });
    }
    if (activityNotify) {
      await notifyActivity({
        workspaceId: session.user.workspaceId,
        actorId: uid,
        toUserId: activityNotify.toUserId,
        packetId: packet._id.toString(),
        parentId: packet.parentId.toString(),
        message: activityNotify.message,
        snippet: activityNotify.snippet,
      });
    }

    return NextResponse.json({
      packet: serializePacket(packet, userMap, parent?.name ?? "Account"),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
