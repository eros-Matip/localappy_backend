import { Types, Document } from "mongoose";

export default interface IRegistration extends Document {
  date: Date;
  customer: Types.ObjectId;
  event: Types.ObjectId;
  price: number;
  bill?: Types.ObjectId;
  status: "pending" | "confirmed" | "cancelled";
  paymentMethod: "credit_card" | "applePay" | "googlePay" | "paypal" | "cash";
  quantity: number;
  notes?: string;
  discountCode?: string;
  seatNumber?: string;
  checkInStatus?: "pending" | "checked-in" | "no-show";
  ticketNumber?: string;
  referrer?: Types.ObjectId;
  specialRequests?: string;
  cancellationReason?: string;
  isVip?: boolean;
  extras?: { item: string; price: number }[];
  invoiceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
