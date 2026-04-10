import { Document, Types } from "mongoose";

export interface IUserLoyaltyCard extends Document {
  // 🔗 Relations
  userId: Types.ObjectId;
  establishmentId: Types.ObjectId;
  loyaltyProgramId: Types.ObjectId;

  // 📊 Progression
  currentStamps: number;

  status: "active" | "reward_available";

  // 🔁 Historique
  completedCardsCount: number;

  lastScannedAt?: Date | null;
  lastRewardRedeemedAt?: Date | null;

  // 🕒 Timestamps mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
