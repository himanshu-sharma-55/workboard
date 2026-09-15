import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {
  /* ignore */
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required in .env.local");
  process.exit(1);
}

const WorkspaceSchema = new mongoose.Schema(
  { name: String, slug: { type: String, unique: true } },
  { timestamps: true }
);
const UserSchema = new mongoose.Schema(
  {
    workspaceId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: String,
  },
  { timestamps: true }
);
const ParentSchema = new mongoose.Schema(
  {
    workspaceId: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);
const PacketSchema = new mongoose.Schema(
  {
    workspaceId: mongoose.Schema.Types.ObjectId,
    parentId: mongoose.Schema.Types.ObjectId,
    title: String,
    intent: String,
    status: String,
    ownerId: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    comments: [mongoose.Schema.Types.Mixed],
    decisions: [mongoose.Schema.Types.Mixed],
    openQuestions: [mongoose.Schema.Types.Mixed],
    references: [mongoose.Schema.Types.Mixed],
    issues: [mongoose.Schema.Types.Mixed],
    asks: [mongoose.Schema.Types.Mixed],
    timeline: [mongoose.Schema.Types.Mixed],
  },
  { timestamps: true }
);

const Workspace = mongoose.models.Workspace || mongoose.model("Workspace", WorkspaceSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Parent = mongoose.models.Parent || mongoose.model("Parent", ParentSchema);
const Packet = mongoose.models.Packet || mongoose.model("Packet", PacketSchema);

function event(actorId, kind, message, createdAt) {
  return {
    _id: new mongoose.Types.ObjectId(),
    kind,
    message,
    actorId,
    createdAt,
  };
}

async function main() {
  await mongoose.connect(uri);

  await User.deleteMany({
    email: { $in: ["pm@demo.local", "dev@demo.local", "qa@demo.local", "mgr@demo.local"] },
  });

  let workspace = await Workspace.findOne({ slug: "demo-product" });
  if (!workspace) {
    workspace = await Workspace.create({ name: "Demo Product", slug: "demo-product" });
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  async function mk(name, email, role) {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        workspaceId: workspace._id,
        name,
        email,
        passwordHash,
        role,
      });
    } else {
      u.workspaceId = workspace._id;
      u.passwordHash = passwordHash;
      await u.save();
    }
    return u;
  }

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

  const t0 = new Date(Date.now() - 3 * 86400000);
  const t1 = new Date(Date.now() - 2 * 86400000);
  const t2 = new Date(Date.now() - 1 * 86400000);

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
        _id: new mongoose.Types.ObjectId(),
        authorId: mgr._id,
        body: "Priority for Friday demo. Happy path only — admin login + schedule list.",
        createdAt: t0,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        authorId: pm._id,
        body: "Agreed. Out of scope: billing. We'll need Dev to own build and QA to check Thursday.",
        createdAt: t0,
      },
    ],
    decisions: [
      {
        _id: new mongoose.Types.ObjectId(),
        text: "Scope = happy path only; billing out",
        madeBy: mgr._id,
        createdAt: t0,
      },
    ],
    openQuestions: [
      {
        _id: new mongoose.Types.ObjectId(),
        text: "Do we need SSO for the demo account?",
        resolved: true,
        createdBy: pm._id,
        createdAt: t0,
      },
    ],
    references: [
      {
        _id: new mongoose.Types.ObjectId(),
        label: "Jira DELL-204",
        url: "https://example.atlassian.net/browse/DELL-204",
        addedBy: dev._id,
        createdAt: t1,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        label: "Demo script doc",
        url: "https://docs.google.com/document/d/example",
        addedBy: pm._id,
        createdAt: t1,
      },
    ],
    issues: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Schedule list empty after filter",
        detail: "Repro on staging with demo tenant",
        status: "open",
        raisedBy: qa._id,
        createdAt: t2,
      },
    ],
    asks: [
      {
        _id: new mongoose.Types.ObjectId(),
        type: "own",
        toUserId: dev._id,
        fromUserId: pm._id,
        note: "Own the build for Friday demo",
        status: "done",
        createdAt: t1,
        respondedAt: t1,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        type: "check",
        toUserId: qa._id,
        fromUserId: pm._id,
        note: "Please verify happy path before Friday",
        status: "pending",
        createdAt: t2,
      },
    ],
    timeline: [
      event(pm._id, "created", "Packet created · Dell demo req", t0),
      event(mgr._id, "decision", "Decision · Scope = happy path only; billing out", t0),
      event(pm._id, "ask", "Ask · own → Jordan Dev · Own the build for Friday demo", t1),
      event(dev._id, "status_change", "Status · Discussing → In progress", t1),
      event(dev._id, "reference", "Reference · Jira DELL-204", t1),
      event(qa._id, "issue_opened", "Issue raised · Schedule list empty after filter", t2),
      event(qa._id, "status_change", "Status · auto → Blocked (open issue)", t2),
    ],
  });

  console.log("Seeded demo workspace");
  console.log("Parent:", dell.name);
  console.log("Packet:", packet.title);
  console.log("Logins (password: demo1234):");
  console.log("  mgr@demo.local");
  console.log("  pm@demo.local");
  console.log("  dev@demo.local");
  console.log("  qa@demo.local");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
