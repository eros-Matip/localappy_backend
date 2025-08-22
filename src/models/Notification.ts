import { model, Schema } from "mongoose";
import { INotification } from "../interfaces/Notification";

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Utilisateur",
      index: true,
      required: true,
    },
    channel: { type: String, default: "push" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    imageUrl: { type: String },

    tokensSent: [String],
    invalidTokens: [String],
    tickets: [
      {
        id: String,
        status: String,
        message: String,
        details: Schema.Types.Mixed,
      },
    ],

    status: { type: String, default: "queued" },
    error: String,

    queuedAt: { type: Date, default: Date.now },
    sentAt: Date,
    deliveredAt: Date,
    readAt: { type: Date, index: true },
    clickedAt: Date,

    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    establishment: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      index: true,
    },

    // TTL optionnel: si défini, MongoDB supprimera auto après expireAt
    expireAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

// Index utiles
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, status: 1, createdAt: -1 });

export default model<INotification>("Notification", NotificationSchema);
