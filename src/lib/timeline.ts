import mongoose from "mongoose";
import { TimelineKind } from "@/lib/constants";

export function pushTimeline(
  actorId: string,
  kind: TimelineKind,
  message: string,
  meta?: Record<string, unknown>
) {
  return {
    _id: new mongoose.Types.ObjectId(),
    kind,
    message,
    actorId: new mongoose.Types.ObjectId(actorId),
    meta,
    createdAt: new Date(),
  };
}
