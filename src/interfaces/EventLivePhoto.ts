import mongoose, { Document, Schema, Types } from "mongoose";

export interface IEventLivePhoto extends Document {
  event: Types.ObjectId;
  customer: Types.ObjectId;
  imageUrl: string;
  caption?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}
