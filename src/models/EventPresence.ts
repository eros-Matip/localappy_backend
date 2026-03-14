import mongoose, { Schema } from "mongoose";
import { IEventPresence } from "../interfaces/EventPresence";

const EventPresenceSchema = new Schema<IEventPresence>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "geo", "qr"],
      default: "manual",
    },
  },
  { timestamps: true },
);

EventPresenceSchema.index({ event: 1, customer: 1 }, { unique: true });

export default mongoose.model<IEventPresence>(
  "EventPresence",
  EventPresenceSchema,
);
