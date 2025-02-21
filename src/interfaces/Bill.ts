import { Types, Document } from "mongoose";

export default interface IBill extends Document {
  customer: Types.ObjectId; // Client concerné
  registration: Types.ObjectId; // Réservation associée
  amount: number; // Montant total de la facture
  status: "pending" | "paid" | "cancelled"; // Statut de paiement
  paymentMethod: "credit_card" | "paypal" | "cash"; // Méthode de paiement utilisée
  invoiceNumber: string; // Numéro unique de la facture
  issuedDate: Date; // Date d'émission
  dueDate: Date; // Date limite de paiement
  discount?: number; // Réduction appliquée (montant en €)
  taxes?: number; // Montant des taxes (TVA, autres taxes)
  items: { description: string; quantity: number; price: number }[]; // Détails des éléments facturés
  notes?: string; // Notes complémentaires
  createdAt: Date;
  updatedAt: Date;
}
