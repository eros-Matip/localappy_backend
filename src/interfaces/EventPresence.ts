import { Document, Schema, Types } from "mongoose";

export interface IEventPresence extends Document {
  event: Types.ObjectId;
  customer: Types.ObjectId;
  joinedAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
  source: "manual" | "geo" | "qr";
}
