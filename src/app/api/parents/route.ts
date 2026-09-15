import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { Parent } from "@/models/Parent";
import { Packet } from "@/models/Packet";
import { User } from "@/models/User";
import { involvedFromPacket, pendingAsksOf, type InvolvedPerson } from "@/lib/involved";

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = new mongoose.Types.ObjectId(session.user.workspaceId);

    const [parents, packets, users] = await Promise.all([
      Parent.find({ workspaceId }).sort({ updatedAt: -1 }).lean(),
      Packet.find({ workspaceId }).select("parentId ownerId status asks issues").lean(),
      User.find({ workspaceId }).select("name").lean(),
    ]);

    const userMap = Object.fromEntries(users.map((u) => [String(u._id), String(u.name ?? "")]));

    const byParent: Record<
      string,
      {
        total: number;
        byStatus: Record<string, number>;
        openIssues: number;
        waiting: number;
        involved: InvolvedPerson[];
      }
    > = {};

    for (const p of packets) {
      const pid = p.parentId ? String(p.parentId) : "";
      if (!pid) continue;
      if (!byParent[pid]) {
        byParent[pid] = { total: 0, byStatus: {}, openIssues: 0, waiting: 0, involved: [] };
      }
      const bucket = byParent[pid];
      bucket.total += 1;
      if (p.status) bucket.byStatus[p.status] = (bucket.byStatus[p.status] ?? 0) + 1;
      bucket.openIssues += (p.issues ?? []).filter((i: { status?: string }) => i?.status === "open")
        .length;
      if (p.status === "done") continue;
      bucket.waiting += pendingAsksOf(p.asks).length;
      try {
        for (const person of involvedFromPacket(p, userMap)) {
          if (bucket.involved.some((x) => x.id === person.id)) {
            const existing = bucket.involved.find((x) => x.id === person.id);
            if (existing && existing.kind === "waiting" && person.kind === "owner") {
              existing.kind = "owner";
              existing.waitLabel = undefined;
            }
            continue;
          }
          if (bucket.involved.length < 4) bucket.involved.push(person);
        }
      } catch {
        /* skip a bad item; still list the account */
      }
    }

    return NextResponse.json({
      parents: parents.map((p) => {
        const stats = byParent[String(p._id)] ?? {
          total: 0,
          byStatus: {},
          openIssues: 0,
          waiting: 0,
          involved: [] as InvolvedPerson[],
        };
        return {
          id: String(p._id),
          name: p.name,
          description: p.description ?? "",
          stats: {
            ...stats,
            involved: [...stats.involved].sort(
              (a, b) => Number(a.kind !== "owner") - Number(b.kind !== "owner")
            ),
          },
          updatedAt: p.updatedAt,
        };
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    const parent = await Parent.create({
      workspaceId: session.user.workspaceId,
      name: body.name,
      description: body.description ?? "",
      createdBy: session.user.id,
    });
    return NextResponse.json({
      id: parent._id.toString(),
      name: parent.name,
      description: parent.description ?? "",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
