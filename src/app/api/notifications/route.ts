import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

export async function GET() {
  try {
    const session = await requireSession();
    const notes = await Notification.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(40);

    const actorIds = [...new Set(notes.map((n) => n.actorId.toString()))];
    const actors = await User.find({ _id: { $in: actorIds } }).select("name");
    const actorMap = Object.fromEntries(actors.map((a) => [a._id.toString(), a.name]));

    const unreadCount = await Notification.countDocuments({
      userId: session.user.id,
      readAt: null,
    });

    return NextResponse.json({
      unreadCount,
      notifications: notes.map((n) => ({
        id: n._id.toString(),
        kind: n.kind,
        message: n.message,
        snippet: n.snippet ?? "",
        href: n.href,
        packetId: n.packetId.toString(),
        actorName: actorMap[n.actorId.toString()] ?? "Someone",
        read: Boolean(n.readAt),
        createdAt: n.createdAt,
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

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string() }),
  z.object({ action: z.literal("read_all") }),
]);

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = patchSchema.parse(await req.json());

    if (body.action === "read") {
      await Notification.updateOne(
        { _id: body.id, userId: session.user.id },
        { $set: { readAt: new Date() } }
      );
    } else {
      await Notification.updateMany(
        { userId: session.user.id, readAt: null },
        { $set: { readAt: new Date() } }
      );
    }

    const unreadCount = await Notification.countDocuments({
      userId: session.user.id,
      readAt: null,
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
