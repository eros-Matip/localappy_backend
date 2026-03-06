import mongoose, { Schema, Document } from "mongoose";
import { IDailyLoginStat } from "../interfaces/DailyLogin";

const DailyLoginStatSchema: Schema = new Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    totalConnections: {
      type: Number,
      default: 0,
    },
    customerConnections: {
      type: Number,
      default: 0,
    },
    ownerConnections: {
      type: Number,
      default: 0,
    },
    adminConnections: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IDailyLoginStat>(
  "DailyLoginStat",
  DailyLoginStatSchema,
);
