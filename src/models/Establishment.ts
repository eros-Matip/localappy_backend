import { model, Schema } from "mongoose";
import IEstablishment from "../interfaces/Establishment";

const EstablishmentSchema = new Schema<IEstablishment>(
  {
    name: { type: String }, // Nom de l’établissement
    email: String,
    phone: String,
    type: { type: [String] }, // Types d'activité (café, restaurant, boutique...)

    // ✅ NOUVEAU (safe) : différencier entreprise / association
    legalForm: {
      type: String,
      enum: ["company", "association"],
      default: "company",
    },

    address: {
      street: { type: String },
      city: { type: String },
      postalCode: { type: String },
      department: { type: String }, // Département
      region: { type: String }, // Région
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

    description: { type: String }, // Description du commerce
    descriptionI18n: {
      fr: String,
      en: String,
      es: String,
      de: String,
      it: String,
      eu: String,
    },
    logo: { type: String }, // Image principale ou logo
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
      // ✅ EXISTANT : on garde
      siret: { type: String }, // entreprise OU association si elle en a un
      insuranceCertificate: { type: String },
      KBis: { public_id: String, secure_url: String }, // entreprise
      activityCodeNAF: { type: String },

      // ✅ NOUVEAU (safe) : RNA association
      rna: { type: String },

      // ✅ NOUVEAU (safe) : document légal association (statuts, récépissé, JO, etc.)
      legalDocument: {
        public_id: { type: String },
        secure_url: { type: String },
        label: { type: String }, // ex: "Statuts", "Récépissé"
      },
    },

    ads: [{ type: Schema.Types.ObjectId, ref: "Ads" }],
    owner: { type: Schema.Types.ObjectId, ref: "Owner" },
    staff: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    notifications: [{ type: Schema.Types.ObjectId, ref: "Notification" }],
    activated: { type: Boolean, default: false },
    amountAvailable: { type: Number, default: 0 },
    refund: [{ type: Schema.Types.ObjectId, ref: "Bill" }],
  },
  { timestamps: true },
);

const Establishment = model<IEstablishment>(
  "Establishment",
  EstablishmentSchema,
);

export default Establishment;
