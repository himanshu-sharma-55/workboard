import mongoose, { Schema, models, model, type Model } from "mongoose";

export type NotificationKind = "mention" | "ask" | "activity";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  packetId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  kind: NotificationKind;
  message: string;
  snippet?: string;
  href: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    packetId: { type: Schema.Types.ObjectId, ref: "Packet", required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Parent" },
    kind: { type: String, enum: ["mention", "ask", "activity"], required: true },
    message: { type: String, required: true },
    snippet: String,
    href: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);
