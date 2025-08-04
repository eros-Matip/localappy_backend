import { model, Schema } from "mongoose";
import IRegistration from "../interfaces/Registration";

const registrationSchema = new Schema<IRegistration>(
  {
    date: { type: Date, required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    price: { type: Number, required: true },
    bill: { type: Schema.Types.ObjectId, ref: "Bill", required: false },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "paid"],
      default: "pending",
    },
    // cash -> pour les pré-réservations
    paymentMethod: {
      type: String,
      enum: ["credit_card", "applePay", "googlePay", "paypal", "cash"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, required: false },
    discountCode: { type: String, required: false },
    seatNumber: { type: String, required: false },
    checkInStatus: {
      type: String,
      enum: ["pending", "checked-in", "no-show"],
      default: "pending",
    },
    ticketNumber: { type: String, required: false, unique: true },
    referrer: { type: Schema.Types.ObjectId, ref: "Customer", required: false },
    specialRequests: { type: String, required: false },
    cancellationReason: { type: String, required: false },
    isVip: { type: Boolean, default: false },
    extras: [{ item: String, price: Number }],
    invoiceNumber: { type: String, required: false },
  },
  { timestamps: true }
);

const Registration = model<IRegistration>("Registration", registrationSchema);
export default Registration;
