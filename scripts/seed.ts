import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * Seed a demo workspace with the Dell demo flow.
 * Usage: MONGODB_URI=... npm run seed
 */

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");

  await mongoose.connect(uri);

  const { Workspace } = await import("../src/models/Workspace");
  const { User } = await import("../src/models/User");
  const { Parent } = await import("../src/models/Parent");
  const { Packet } = await import("../src/models/Packet");
  const { pushTimeline } = await import("../src/lib/timeline");

  await Promise.all([
    User.deleteMany({ email: { $in: ["pm@demo.local", "dev@demo.local", "qa@demo.local", "mgr@demo.local"] } }),
  ]);

  let workspace = await Workspace.findOne({ slug: "demo-product" });
  if (!workspace) {
    workspace = await Workspace.create({ name: "Demo Product", slug: "demo-product" });
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const mk = async (name: string, email: string, role: "admin" | "member") => {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        workspaceId: workspace!._id,
        name,
        email,
        passwordHash,
        role,
      });
    } else {
      u.workspaceId = workspace!._id;
      u.passwordHash = passwordHash;
      await u.save();
    }
    return u;
  };

  const mgr = await mk("Alex Manager", "mgr@demo.local", "admin");
  const pm = await mk("Sam PM", "pm@demo.local", "member");
  const dev = await mk("Jordan Dev", "dev@demo.local", "member");
  const qa = await mk("Riley Tester", "qa@demo.local", "member");

  await Packet.deleteMany({ workspaceId: workspace._id });
  await Parent.deleteMany({ workspaceId: workspace._id });

  const dell = await Parent.create({
    workspaceId: workspace._id,
    name: "Dell",
    description: "Enterprise demo account",
    createdBy: mgr._id,
  });

  const t0 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const t1 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const t2 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  const packet = await Packet.create({
    workspaceId: workspace._id,
    parentId: dell._id,
    title: "Dell demo req",
    intent:
      "Demo must show live schedule board, status updates, and issue raise flow for the Sep walkthrough.",
    status: "blocked",
    ownerId: dev._id,
    createdBy: pm._id,
    comments: [
      {
        authorId: mgr._id,
        body: "Priority for Friday demo. Happy path only — admin login + schedule list.",
        createdAt: t0,
      },
      {
        authorId: pm._id,
        body: "Agreed. Out of scope: billing. We'll need Dev to own build and QA to check Thursday.",
        createdAt: t0,
      },
    ],
    decisions: [
      {
        text: "Scope = happy path only; billing out",
        madeBy: mgr._id,
        createdAt: t0,
      },
    ],
    openQuestions: [
      {
        text: "Do we need SSO for the demo account?",
        resolved: true,
        createdBy: pm._id,
        createdAt: t0,
      },
    ],
    references: [
      {
        label: "Jira DELL-204",
        url: "https://example.atlassian.net/browse/DELL-204",
        addedBy: dev._id,
        createdAt: t1,
      },
      {
        label: "Demo script doc",
        url: "https://docs.google.com/document/d/example",
        addedBy: pm._id,
        createdAt: t1,
      },
    ],
    issues: [
      {
        title: "Schedule list empty after filter",
        detail: "Repro on staging with demo tenant",
        status: "open",
        raisedBy: qa._id,
        createdAt: t2,
      },
    ],
    asks: [
      {
        type: "own",
        toUserId: dev._id,
        fromUserId: pm._id,
        note: "Own the build for Friday demo",
        status: "done",
        createdAt: t1,
        respondedAt: t1,
      },
      {
        type: "check",
        toUserId: qa._id,
        fromUserId: pm._id,
        note: "Please verify happy path before Friday",
        status: "pending",
        createdAt: t2,
      },
    ],
    timeline: [
      { ...pushTimeline(pm._id.toString(), "created", "Packet created · Dell demo req"), createdAt: t0 },
      {
        ...pushTimeline(mgr._id.toString(), "decision", "Decision · Scope = happy path only; billing out"),
        createdAt: t0,
      },
      {
        ...pushTimeline(pm._id.toString(), "ask", "Ask · own → Jordan Dev · Own the build for Friday demo"),
        createdAt: t1,
      },
      {
        ...pushTimeline(dev._id.toString(), "status_change", "Status · Discussing → In progress"),
        createdAt: t1,
      },
      {
        ...pushTimeline(dev._id.toString(), "reference", "Reference · Jira DELL-204"),
        createdAt: t1,
      },
      {
        ...pushTimeline(qa._id.toString(), "issue_opened", "Issue raised · Schedule list empty after filter"),
        createdAt: t2,
      },
      {
        ...pushTimeline(qa._id.toString(), "status_change", "Status · auto → Blocked (open issue)"),
        createdAt: t2,
      },
    ],
  });

  console.log("Seeded demo workspace");
  console.log("Parent:", dell.name, dell._id.toString());
  console.log("Packet:", packet.title, packet._id.toString());
  console.log("Logins (password: demo1234):");
  console.log("  mgr@demo.local  — Alex Manager");
  console.log("  pm@demo.local   — Sam PM");
  console.log("  dev@demo.local  — Jordan Dev");
  console.log("  qa@demo.local   — Riley Tester");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
