import mongoose, { Schema } from "mongoose";
import { IDailyCityConsultationStat } from "../interfaces/DailyCityConsultationStat";

const DailyCityConsultationStatSchema: Schema = new Schema(
  {
    date: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    totalConsultations: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

DailyCityConsultationStatSchema.index({ date: 1, city: 1 }, { unique: true });

export default mongoose.model<IDailyCityConsultationStat>(
  "DailyCityConsultationStat",
  DailyCityConsultationStatSchema,
);
