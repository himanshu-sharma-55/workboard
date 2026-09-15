import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSession } from "@/lib/session";
import { Packet } from "@/models/Packet";
import { Parent } from "@/models/Parent";
import { User } from "@/models/User";
import { activityLine } from "@/lib/activity";
import { firstOpenIssueTitle, involvedFromPacket, waitingHint, waitingOnNames } from "@/lib/involved";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = new mongoose.Types.ObjectId(session.user.workspaceId);
    const uid = session.user.id;

    const [packets, parents, users] = await Promise.all([
      Packet.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100),
      Parent.find({ workspaceId }),
      User.find({ workspaceId }).select("name"),
    ]);

    const parentMap = Object.fromEntries(parents.map((p) => [p._id.toString(), p.name]));
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

    const columns = {
      planned: ["intake", "discussing", "ready"],
      happening: ["in_progress"],
      blocked: ["blocked"],
      done: ["done"],
    } as const;

    const bucket = (status: string) => {
      if (columns.planned.includes(status as never)) return "planned";
      if (columns.happening.includes(status as never)) return "happening";
      if (columns.blocked.includes(status as never)) return "blocked";
      return "done";
    };

    const items = packets.map((p) => {
      const pending = (p.asks ?? []).filter(
        (a: { status?: string; type?: string; toUserId?: unknown }) =>
          a?.status === "pending" && a?.type !== "own" && a?.toUserId != null
      );
      const waitingOnMe = pending.some((a) => String(a.toUserId) === uid);
      const names = waitingOnNames(p.asks, userMap);
      const last = (p.timeline ?? []).at(-1);
      return {
        id: p._id.toString(),
        title: p.title,
        status: p.status,
        bucket: bucket(p.status),
        parentId: p.parentId.toString(),
        parentName: parentMap[p.parentId.toString()] ?? "—",
        ownerId: p.ownerId?.toString() ?? null,
        ownerName: p.ownerId ? userMap[p.ownerId.toString()] ?? null : null,
        openIssues: (p.issues ?? []).filter((i: { status: string }) => i.status === "open")
          .length,
        pendingAsks: pending.length,
        waitingOnMe,
        waitingOnNames: names,
        waitingHint: waitingHint(p.asks),
        involved: involvedFromPacket(p, userMap),
        issueHint: firstOpenIssueTitle(p.issues),
        activity: activityLine({
          kind: last?.kind,
          actorName: last ? userMap[last.actorId.toString()] : userMap[p.createdBy.toString()],
          at: last?.createdAt ?? p.createdAt,
        }),
        updatedAt: p.updatedAt,
      };
    });

    return NextResponse.json({
      items,
      summary: {
        planned: items.filter((i) => i.bucket === "planned").length,
        happening: items.filter((i) => i.bucket === "happening").length,
        blocked: items.filter((i) => i.bucket === "blocked").length,
        done: items.filter((i) => i.bucket === "done").length,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
