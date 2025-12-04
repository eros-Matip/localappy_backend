import { model, Schema } from "mongoose";
import IEvent from "../interfaces/Event";

const eventSchema = new Schema<IEvent>(
  {
    title: String,
    theme: {
      type: [String],
      validate: {
        validator: function (themes: string[]) {
          if (!themes || !Array.isArray(themes) || themes.length === 0) {
            return true;
          }
          return themes.every(
            (theme) => typeof theme === "string" && theme.trim() !== ""
          );
        },
        message: "Chaque thème doit être une chaîne non vide.",
      },
    },
    startingDate: Date,
    endingDate: Date,
    address: String,
    location: {
      lat: Number,
      lng: Number,
      geo: {
        type: {
          type: String,
          enum: ["Point"],
          required: false,
        },
        coordinates: {
          type: [Number],
          required: false,
          validate: {
            validator: function (coordinates: number[]) {
              return coordinates.length === 2;
            },
            message:
              "Les coordonnées doivent contenir exactement deux valeurs : [longitude, latitude].",
          },
        },
      },
    },
    price: { type: Number, default: 0 },
    priceSpecification: {
      minPrice: Number,
      maxPrice: Number,
      priceCurrency: String,
    },
    favorieds: [
      {
        customer: { type: Schema.Types.ObjectId, ref: "Customer" },
        date: Date,
      },
    ],
    clics: [
      {
        source: String,
        date: Date,
        _id: false,
      },
    ],
    acceptedPaymentMethod: [String],
    organizer: {
      establishment: { type: Schema.Types.ObjectId, ref: "Establishment" },
      legalName: { type: String, default: "Organisateur inconnu" },
      email: { type: String, default: "Email inconnu" },
      phone: { type: String, default: "Téléphone inconnu" },
    },
    capacity: { type: Number, default: 0 },
    registrationOpen: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false },
    registrations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Registration",
      },
    ],
    bills: [
      {
        type: Schema.Types.ObjectId,
        ref: "Bill",
      },
    ],
    entries: [
      {
        checkedInAt: Date,
        registration: { type: Schema.Types.ObjectId, ref: "Registration" },
        byWho: {
          type: Schema.Types.ObjectId,
          required: true,
          refPath: "byWhoModel",
        },
        byWhoModel: {
          type: String,
          required: true,
          enum: ["Customer", "Owner"],
        },
      },
    ],
    image: {
      type: [String],
      validate: {
        validator: function (images: string[]) {
          return images.every((img) => img.trim() !== "");
        },
        message: "Une ou plusieurs images sont invalides.",
      },
    },
    description: String,
    translations: [
      {
        lang: { type: String, required: true }, // "fr", "en", "es", ...
        title: { type: String },
        description: { type: String },
        shortDescription: { type: String },
        _id: false,
      },
    ],

    color: String,
  },
  { timestamps: true }
);

eventSchema.index({
  title: 1,
  address: 1,
  startingDate: 1,
});

const Event = model<IEvent>("Event", eventSchema);
export default Event;
