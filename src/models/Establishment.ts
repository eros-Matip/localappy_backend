import { model, Schema } from "mongoose";
import IEstablishment from "../interfaces/Establishment";

const EstablishmentSchema = new Schema<IEstablishment>(
  {
    name: { type: String, required: true }, // Nom de l’établissement
    type: { type: [String], required: true }, // Types d'activité (café, restaurant, boutique...)
    address: {
      street: { type: String },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      department: { type: String, required: true }, // Département
      region: { type: String, required: true }, // Région
      country: { type: String, required: true },
    },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
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
        dayOfWeek: { type: String, required: true },
        opens: { type: String, required: true },
        closes: { type: String, required: true },
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
  },
  { timestamps: true } // Ajoute automatiquement `createdAt` et `updatedAt`
);

const Establishment = model<IEstablishment>(
  "Establishment",
  EstablishmentSchema
);

export default Establishment;
