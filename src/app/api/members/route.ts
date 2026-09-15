import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { Packet } from "@/models/Packet";
import { User } from "@/models/User";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await requireSession();
    const [users, packets] = await Promise.all([
      User.find({ workspaceId: session.user.workspaceId }).select("name email role").sort({ name: 1 }),
      Packet.find({ workspaceId: session.user.workspaceId }).select("ownerId status asks"),
    ]);

    return NextResponse.json({
      members: users.map((u) => {
        const id = u._id.toString();
        const ownedOpen = packets.filter(
          (p) => p.ownerId?.toString() === id && p.status !== "done"
        );
        const waitingOn = packets.reduce((n, p) => {
          return (
            n +
            (p.asks ?? []).filter(
              (a) =>
                a?.status === "pending" &&
                a?.type !== "own" &&
                a?.toUserId != null &&
                String(a.toUserId) === id
            ).length
          );
        }, 0);
        return {
          id,
          name: u.name,
          email: u.email,
          role: u.role,
          owned: ownedOpen.length,
          blocked: ownedOpen.filter((p) => p.status === "blocked").length,
          waitingOn,
        };
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = inviteSchema.parse(await req.json());
    const email = body.email.toLowerCase();
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: "Email already used" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      workspaceId: session.user.workspaceId,
      name: body.name,
      email,
      passwordHash,
      role: "member",
    });
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to invite" }, { status: 500 });
  }
}
