import { model, Schema } from "mongoose";
import IEstablishment from "../interfaces/Establishment";

const EstablishmentSchema = new Schema<IEstablishment>(
  {
    name: { type: String }, // Nom de l’établissement
    type: { type: [String] }, // Types d'activité (café, restaurant, boutique...)
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
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
      },
    },

    description: { type: String }, // Description du commerce
    logo: { type: String }, // Image principale ou logo

    openingHours: [
      {
        dayOfWeek: { type: String },
        opens: { type: String },
        closes: { type: String },
      },
    ],

    acceptedPayments: [
      {
        type: { type: String },
        label: { type: String },
      },
    ],
    legalInfo: {
      insuranceCertificate: { type: String },
      KBis: { public_id: String, secure_url: String },
      activityCodeNAF: { type: String },
    },
    owner: { type: Schema.Types.ObjectId, ref: "Owner" },
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    activated: { type: Boolean, default: false },
  },
  { timestamps: true } // Ajoute automatiquement `createdAt` et `updatedAt`
);

const Establishment = model<IEstablishment>(
  "Establishment",
  EstablishmentSchema
);

export default Establishment;
