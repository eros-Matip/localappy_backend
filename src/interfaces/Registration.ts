import { Types, Document } from "mongoose";

export default interface IRegistration extends Document {
  date: Date;
  customer: Types.ObjectId;
  event: Types.ObjectId;
  price: number;
  bill?: Types.ObjectId;
  status: "pending" | "confirmed" | "cancelled" | "paid";
  paymentMethod:
    | "credit_card"
    | "applePay"
    | "googlePay"
    | "paypal"
    | "cash"
    | "free";
  quantity: number;
  notes?: string;
  discountCode?: string;
  seatNumber?: string;

  /** Statut du ticket à l'entrée */
  checkInStatus?: "pending" | "checked-in" | "no-show";

  /** Numéro unique du ticket */
  ticketNumber?: string;

  /** Si le ticket a été scanné : date et responsable */
  checkedInAt?: Date; // 🕒 Heure exacte du scan
  checkedInBy?: Types.ObjectId; // 👤 ID du staff ou du gérant

  referrer?: Types.ObjectId;
  specialRequests?: string;
  cancellationReason?: string;
  isVip?: boolean;
  extras?: { item: string; price: number }[];
  invoiceNumber?: string;

  createdAt: Date;
  updatedAt: Date;
}
