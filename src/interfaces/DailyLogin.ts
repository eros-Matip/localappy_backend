import { Document } from "mongoose";

export interface IDailyLoginStat extends Document {
  date: string;
  totalConnections: number;
  customerConnections: number;
  ownerConnections: number;
  adminConnections: number;
}
