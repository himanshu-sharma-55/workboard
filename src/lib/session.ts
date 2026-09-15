import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.workspaceId) {
    throw new Error("UNAUTHORIZED");
  }
  await connectDB();
  return session;
}
