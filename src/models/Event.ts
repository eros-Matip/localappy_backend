import { model, Schema } from "mongoose";
import IEvent from "../interfaces/Event";

const eventSchema = new Schema<IEvent>(
  {
    title: String,
    theme: {
      type: [String],
      validate: {
        validator: function (themes: string[]) {
          // Si theme est undefined ou non fourni, ne pas valider (laisse passer)
          if (!themes || !Array.isArray(themes) || themes.length === 0) {
            return true;
          }
          // Sinon, valider que chaque thème n'est pas vide
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
          type: String, // Type géospatial (doit être "Point")
          enum: ["Point"],
          required: false,
        },
        coordinates: {
          type: [Number], // Tableau contenant [longitude, latitude]
          required: false,
          validate: {
            validator: function (coordinates: number[]) {
              return coordinates.length === 2; // Longitude et latitude
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
    color: String,
  },
  { timestamps: true }
);

const Event = model<IEvent>("Event", eventSchema);
export default Event;
