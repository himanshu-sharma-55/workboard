import mongoose, { Schema, models, model, type HydratedDocument, type Model } from "mongoose";
import { ASK_TYPES, PACKET_STATUSES, TIMELINE_KINDS } from "@/lib/constants";

export interface IComment {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
}

export interface IDecision {
  _id: mongoose.Types.ObjectId;
  text: string;
  madeBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IOpenQuestion {
  _id: mongoose.Types.ObjectId;
  text: string;
  resolved: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IReference {
  _id: mongoose.Types.ObjectId;
  label: string;
  url: string;
  addedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IIssue {
  _id: mongoose.Types.ObjectId;
  title: string;
  detail?: string;
  status: "open" | "resolved";
  raisedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IAsk {
  _id: mongoose.Types.ObjectId;
  type: (typeof ASK_TYPES)[number];
  toUserId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  note?: string;
  status: "pending" | "done" | "declined";
  createdAt: Date;
  respondedAt?: Date;
}

export interface IAttachment {
  name: string;
  url: string;
}

/** Anything that surfaces mid-process — free text + optional attachments */
export interface ICameUp {
  _id: mongoose.Types.ObjectId;
  body: string;
  attachments: IAttachment[];
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ITimelineEvent {
  _id: mongoose.Types.ObjectId;
  kind: (typeof TIMELINE_KINDS)[number];
  message: string;
  actorId: mongoose.Types.ObjectId;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export interface IPacket {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  title: string;
  intent: string;
  status: (typeof PACKET_STATUSES)[number];
  ownerId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  comments: IComment[];
  decisions: IDecision[];
  openQuestions: IOpenQuestion[];
  references: IReference[];
  issues: IIssue[];
  asks: IAsk[];
  cameUps: ICameUp[];
  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export type PacketDocument = HydratedDocument<IPacket>;

const CommentSchema = new Schema<IComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DecisionSchema = new Schema<IDecision>(
  {
    text: { type: String, required: true },
    madeBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const OpenQuestionSchema = new Schema<IOpenQuestion>(
  {
    text: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ReferenceSchema = new Schema<IReference>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const IssueSchema = new Schema<IIssue>(
  {
    title: { type: String, required: true },
    detail: String,
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  { _id: true }
);

const AskSchema = new Schema<IAsk>(
  {
    type: { type: String, enum: ASK_TYPES, required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: String,
    status: { type: String, enum: ["pending", "done", "declined"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    respondedAt: Date,
  },
  { _id: true }
);

const CameUpSchema = new Schema<ICameUp>(
  {
    body: { type: String, required: true },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    kind: { type: String, enum: TIMELINE_KINDS, required: true },
    message: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    meta: Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PacketSchema = new Schema<IPacket>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Parent", required: true, index: true },
    title: { type: String, required: true },
    intent: { type: String, default: "" },
    status: { type: String, enum: PACKET_STATUSES, default: "intake" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: [CommentSchema],
    decisions: [DecisionSchema],
    openQuestions: [OpenQuestionSchema],
    references: [ReferenceSchema],
    issues: [IssueSchema],
    asks: [AskSchema],
    cameUps: { type: [CameUpSchema], default: [] },
    timeline: [TimelineEventSchema],
  },
  { timestamps: true }
);

export const Packet: Model<IPacket> =
  (models.Packet as Model<IPacket>) || model<IPacket>("Packet", PacketSchema);
