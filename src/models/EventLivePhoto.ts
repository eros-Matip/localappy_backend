import mongoose, { Schema } from "mongoose";
import { IEventLivePhoto } from "../interfaces/EventLivePhoto";

const EventLivePhotoSchema = new Schema<IEventLivePhoto>(
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
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IEventLivePhoto>(
  "EventLivePhoto",
  EventLivePhotoSchema,
);
