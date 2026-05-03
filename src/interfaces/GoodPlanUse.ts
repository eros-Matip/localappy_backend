import { Document, Types } from "mongoose";

export interface IGoodPlanUse extends Document {
  goodPlan: Types.ObjectId;
  establishment: Types.ObjectId;
  customer: Types.ObjectId;

  scannedByCustomer: Types.ObjectId;
  scannedByOwner?: Types.ObjectId | null;

  source: "qr_scan";
  status: "validated" | "cancelled";

  qrIssuedAt?: Date | null;
  qrExpiresAt?: Date | null;
  usedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export default IGoodPlanUse;
