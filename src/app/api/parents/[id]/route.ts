import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { Parent } from "@/models/Parent";
import { Packet } from "@/models/Packet";
import { User } from "@/models/User";
import { PACKET_STATUS_ENUM } from "@/lib/constants";
import { pushTimeline } from "@/lib/timeline";
import { activityLine } from "@/lib/activity";
import { firstOpenIssueTitle, involvedFromPacket, waitingHint, waitingOnNames } from "@/lib/involved";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parent = await Parent.findOne({
      _id: id,
      workspaceId: session.user.workspaceId,
    });
    if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const packets = await Packet.find({
      parentId: parent._id,
      workspaceId: session.user.workspaceId,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const users = await User.find({ workspaceId: session.user.workspaceId })
      .select("name email")
      .lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u.name as string]));

    return NextResponse.json({
      parent: {
        id: parent._id.toString(),
        name: parent.name,
        description: parent.description ?? "",
      },
      members: users.map((u) => ({
        id: String(u._id),
        name: u.name as string,
        email: u.email as string,
      })),
      packets: packets.map((p) => {
        const pending = (p.asks ?? []).filter(
          (a: { status?: string; type?: string; toUserId?: unknown }) =>
            a?.status === "pending" && a?.type !== "own" && a?.toUserId != null
        );
        const last = (p.timeline ?? []).at(-1);
        return {
          id: String(p._id),
          title: p.title,
          intent: p.intent,
          status: p.status,
          ownerId: p.ownerId ? String(p.ownerId) : null,
          ownerName: p.ownerId ? userMap[String(p.ownerId)] ?? null : null,
          openIssues: (p.issues ?? []).filter((i: { status: string }) => i.status === "open").length,
          pendingAsks: pending.length,
          waitingOnNames: waitingOnNames(p.asks, userMap),
          waitingHint: waitingHint(p.asks),
          involved: involvedFromPacket(p, userMap),
          issueHint: firstOpenIssueTitle(p.issues),
          activity: activityLine({
            kind: last?.kind,
            actorName: last?.actorId
              ? userMap[String(last.actorId)]
              : p.createdBy
                ? userMap[String(p.createdBy)]
                : null,
            at: last?.createdAt ?? p.createdAt,
          }),
          updatedAt: p.updatedAt,
        };
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const packetSchema = z.object({
  title: z.string().min(1),
  intent: z.string().optional(),
  status: z.enum(PACKET_STATUS_ENUM).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = packetSchema.parse(await req.json());

    const parent = await Parent.findOne({
      _id: id,
      workspaceId: session.user.workspaceId,
    });
    if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const status = body.status ?? "intake";
    const packet = await Packet.create({
      workspaceId: session.user.workspaceId,
      parentId: parent._id,
      title: body.title,
      intent: body.intent ?? "",
      status,
      createdBy: session.user.id,
      timeline: [
        pushTimeline(session.user.id, "created", `Work item created · ${body.title}`),
      ],
    });

    return NextResponse.json({ id: packet._id.toString() });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create work item" }, { status: 500 });
  }
}
