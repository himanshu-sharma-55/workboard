import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const parts = await ctx.params;
    const segments = parts.path ?? [];
    if (segments.length < 2) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [workspaceId, ...rest] = segments;
    if (workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileName = rest.join("/");
    if (fileName.includes("..") || fileName.includes("\\") || path.isAbsolute(fileName)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const full = path.join(process.cwd(), "uploads", workspaceId, fileName);
    const data = await readFile(full).catch(() => null);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(fileName).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".webp"
              ? "image/webp"
              : ext === ".pdf"
                ? "application/pdf"
                : "application/octet-stream";

    const displayName = path.basename(fileName).replace(/^\d+-[a-z0-9]+-/, "");

    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(data.length),
        "Content-Disposition": `inline; filename="${displayName}"`,
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
