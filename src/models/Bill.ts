import mongoose, { Schema, model } from "mongoose";
import IBill from "../interfaces/Bill";

const billSchema = new Schema<IBill>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    registration: {
      type: Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "paypal", "cash"],
      required: true,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    issuedDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    discount: { type: Number, required: false },
    taxes: { type: Number, required: false },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
      },
    ],
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

const Bill = model<IBill>("Bill", billSchema);
export default Bill;
