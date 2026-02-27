import { model, Schema } from "mongoose";
import IEstablishment from "../interfaces/Establishment";

const EstablishmentSchema = new Schema<IEstablishment>(
  {
    name: { type: String },
    email: String,
    phone: String,
    type: { type: [String] },

    legalForm: {
      type: String,
      enum: ["company", "association"],
      default: "company",
    },

    address: {
      street: { type: String },
      city: { type: String },
      postalCode: { type: String },
      department: { type: String },
      region: { type: String },
      country: { type: String },
    },

    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    contact: {
      email: { type: String },
      telephone: { type: String },
      fax: { type: String },
      website: { type: String },
      socialMedia: {
        type: new Schema(
          {
            facebook: { type: String },
            instagram: { type: String },
            twitter: { type: String },
          },
          { _id: false },
        ),
        default: undefined,
      },
    },

    description: { type: String },
    descriptionI18n: {
      fr: String,
      en: String,
      es: String,
      de: String,
      it: String,
      eu: String,
    },
    logo: { type: String },
    photos: { type: [String] },

    openingHours: [
      {
        dayOfWeek: { type: String },
        opens: { type: String },
        closes: { type: String },
        _id: false,
      },
    ],

    acceptedPayments: [
      {
        type: { type: String },
        label: { type: String },
      },
    ],

    legalInfo: {
      siret: { type: String },
      insuranceCertificate: { type: String },

      KBis: {
        type: new Schema(
          {
            public_id: { type: String },
            secure_url: { type: String },
          },
          { _id: false },
        ),
        default: undefined,
      },

      activityCodeNAF: { type: String },
      rna: { type: String },

      legalDocument: {
        type: new Schema(
          {
            public_id: { type: String },
            secure_url: { type: String },
            label: { type: String },
          },
          { _id: false },
        ),
        default: undefined,
      },

      rib: {
        type: new Schema(
          {
            iban: { type: String },
            bic: { type: String },
          },
          { _id: false },
        ),
        default: undefined,
      },

      _id: false,
    },
    ads: [{ type: Schema.Types.ObjectId, ref: "Ads" }],
    owner: [{ type: Schema.Types.ObjectId, ref: "Owner" }],
    staff: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    notifications: [{ type: Schema.Types.ObjectId, ref: "Notification" }],
    activated: { type: Boolean, default: false },
    amountAvailable: { type: Number, default: 0 },
    refund: [{ type: Schema.Types.ObjectId, ref: "Bill" }],
    banned: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    activationRequested: { type: Boolean, default: false },
    activationRequestedAt: { type: Date, default: null },
    activationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    activationReviewedAt: { type: Date, default: null },
    activationReviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true },
);

// --- INDEXES (perf) ---
EstablishmentSchema.index({ activated: 1 });
EstablishmentSchema.index({ "address.department": 1, activated: 1 });
EstablishmentSchema.index({ "address.city": 1 });
EstablishmentSchema.index({ email: 1 });
EstablishmentSchema.index({ owner: 1 });
// Optionnel
EstablishmentSchema.index({ events: 1 });
EstablishmentSchema.index({ deletedAt: 1, createdAt: -1 });
EstablishmentSchema.index({ banned: 1, activated: 1 });
EstablishmentSchema.index({ "address.postalCode": 1 });

const Establishment = model<IEstablishment>(
  "Establishment",
  EstablishmentSchema,
);

export default Establishment;
