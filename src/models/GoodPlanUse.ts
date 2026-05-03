import { Schema, model } from "mongoose";
import IGoodPlanUse from "../interfaces/GoodPlanUse";

const GoodPlanUseSchema = new Schema<IGoodPlanUse>(
  {
    goodPlan: {
      type: Schema.Types.ObjectId,
      ref: "GoodPlan",
      required: true,
      index: true,
    },

    establishment: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
      index: true,
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    scannedByCustomer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    scannedByOwner: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      default: null,
    },

    source: {
      type: String,
      enum: ["qr_scan"],
      default: "qr_scan",
    },

    status: {
      type: String,
      enum: ["validated", "cancelled"],
      default: "validated",
    },

    qrIssuedAt: {
      type: Date,
      default: null,
    },

    qrExpiresAt: {
      type: Date,
      default: null,
    },

    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

GoodPlanUseSchema.index({ goodPlan: 1, customer: 1, status: 1 });
GoodPlanUseSchema.index({ establishment: 1, usedAt: -1 });
GoodPlanUseSchema.index({ scannedByCustomer: 1, usedAt: -1 });

const GoodPlanUse = model<IGoodPlanUse>("GoodPlanUse", GoodPlanUseSchema);

export default GoodPlanUse;
