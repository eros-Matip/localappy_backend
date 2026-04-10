import { model, Schema } from "mongoose";

const UserLoyaltyCardSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
    },
    loyaltyProgramId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    currentStamps: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "reward_available"],
      default: "active",
    },
    completedCardsCount: {
      type: Number,
      default: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    lastRewardRedeemedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

UserLoyaltyCardSchema.index(
  { userId: 1, establishmentId: 1, loyaltyProgramId: 1 },
  { unique: true },
);

export default model("UserLoyaltyCard", UserLoyaltyCardSchema);
