import { Document, Types } from "mongoose";

export type GoodPlanType =
  | "discount"
  | "free_item"
  | "special_offer"
  | "last_minute"
  | "loyalty_bonus"
  | "event_offer"
  | "custom";

export type GoodPlanStatus = "draft" | "published" | "expired" | "disabled";

export type GoodPlanRedemptionMode = "none" | "code" | "qr";

export interface IGoodPlanAvailability {
  daysOfWeek?: (
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday"
  )[];
  startTime?: string | null;
  endTime?: string | null;
}

export interface IGoodPlanRedemption {
  mode: GoodPlanRedemptionMode;
  code?: string | null;
  maxUses?: number | null;
  usesCount: number;
  oneUsePerUser: boolean;
}

export interface IGoodPlanStats {
  views: number;
  clicks: number;
  uses: number;
}

export type GoodPlanDayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

interface IGoodPlan extends Document {
  title: string;
  shortDescription: string;
  description?: string;

  type: GoodPlanType;

  establishment: Types.ObjectId;
  createdByOwner?: Types.ObjectId | null;
  createdByCustomer?: Types.ObjectId | null;

  image?: string | null;

  startDate: Date;
  endDate: Date;

  availability?: IGoodPlanAvailability;

  conditions?: string;

  redemption: IGoodPlanRedemption;

  stats: IGoodPlanStats;

  status: GoodPlanStatus;
  isActive: boolean;

  deletedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export default IGoodPlan;
