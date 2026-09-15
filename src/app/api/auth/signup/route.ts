import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Workspace } from "@/models/Workspace";
import { User } from "@/models/User";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  workspaceName: z.string().min(2),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    await connectDB();

    const email = body.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const workspace = await Workspace.create({
      name: body.workspaceName,
      slug: slugify(body.workspaceName),
    });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      workspaceId: workspace._id,
      name: body.name,
      email,
      passwordHash,
      role: "admin",
    });

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      workspaceId: workspace._id.toString(),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
