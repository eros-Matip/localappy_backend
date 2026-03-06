import { Document } from "mongoose";

export interface IDailyCityConsultationStat extends Document {
  date: string;
  city: string;
  totalConsultations: number;
}
