import { Schema, model } from "mongoose";
import IAd from "../interfaces/Ads";

const adSchema = new Schema<IAd>({
  type: { type: String, required: true, enum: ["ad"] },
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: [{ type: String, required: true }],
  event: { type: Schema.Types.ObjectId, ref: "Event" },
  clics: [
    {
      source: String,
      date: Date,
    },
  ],
});

export const AdModel = model<IAd>("Ad", adSchema);
