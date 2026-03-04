import { Document, Types } from "mongoose";

export interface IQrScan extends Document {
  establishment: Types.ObjectId;
  customer?: Types.ObjectId; // si connecté
  scannedAt: Date;
  device?: string;
  source?: "flyer" | "table" | "sticker" | "unknown";
}
