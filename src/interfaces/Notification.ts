// models/Notification.ts
import { Schema, model, Types, Document } from "mongoose";

export type NotificationChannel = "push";
export type NotificationStatus =
  | "queued" // créée mais pas encore envoyée
  | "sent" // envoyée à Expo
  | "delivered" // (optionnel) accusé de réception Expo
  | "failed" // échec d’envoi
  | "read" // lue par l’utilisateur
  | "clicked"; // cliquée (deep link ouvert)

export interface INotification extends Document {
  user: Types.ObjectId; // destinataire
  channel: NotificationChannel; // "push"
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;

  // Métadonnées d’envoi
  tokensSent?: string[]; // tokens utilisés pour cet user
  invalidTokens?: string[];
  tickets?: Array<{
    id?: string;
    status?: string;
    message?: string;
    details?: any;
  }>;

  status: NotificationStatus;
  error?: string;

  // Suivi / dates
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  clickedAt?: Date;

  // Cibles métier (facultatives) pour filtrer
  event?: Types.ObjectId;
  establishment?: Types.ObjectId;

  // TTL optionnel (ex: auto purge après 90j)
  expireAt?: Date;
}
