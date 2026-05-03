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
            (theme) => typeof theme === "string" && theme.trim() !== "",
          );
        },
        message: "Chaque thème doit être une chaîne non vide.",
      },
    },

    startingDate: Date,
    endingDate: Date,

    /**
     * Nouveau champ non cassant :
     * Permet de gérer :
     * - événement ponctuel
     * - événement multi-dates
     * - événement longue période
     * - événement sans horaires
     */
    occurrences: [
      {
        startDate: { type: Date, required: false },
        endDate: { type: Date, required: false },

        // On garde les heures en String pour éviter les problèmes de timezone.
        startTime: { type: String, default: null }, // ex: "20:30:00"
        endTime: { type: String, default: null }, // ex: "22:00:00"

        daysOfWeek: [
          {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
          },
        ],

        label: { type: String, default: null }, // ex: "Tous les jours", "Vendredi"
        isRecurring: { type: Boolean, default: false },

        _id: false,
      },
    ],

    address: String,

    addressDetails: {
      streetAddress: [String],
      postalCode: String,
      city: String,
      department: String,
      departmentCode: String,
      region: String,
      regionCode: String,
      country: String,
      insee: String,
    },

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
              return (
                !coordinates ||
                coordinates.length === 0 ||
                coordinates.length === 2
              );
            },
            message:
              "Les coordonnées doivent contenir exactement deux valeurs : [longitude, latitude].",
          },
        },
      },
    },

    price: { type: Number, default: 0 },

    priceLabel: { type: String, default: null }, // ex: "Gratuit", "À partir de 7,50 € par personne"
    isFree: { type: Boolean, default: false },

    priceSpecification: {
      minPrice: Number,
      maxPrice: Number,
      priceCurrency: String,
      pricingMode: String, // ex: "Par personne"
      pricingOffer: String, // ex: "Ticket"
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
      website: { type: String, default: null },
    },

    contact: {
      email: { type: String, default: null },
      phone: { type: String, default: null },
      website: { type: String, default: null },
      bookingUrl: { type: String, default: null },
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

    /**
     * Ancien champ conservé pour ne rien casser en prod.
     */
    image: {
      type: [String],
      validate: {
        validator: function (images: string[]) {
          if (!images) return true;
          if (!Array.isArray(images)) return false;
          return images.every(
            (img) => typeof img === "string" && img.trim() !== "",
          );
        },
        message: "Une ou plusieurs images sont invalides.",
      },
    },

    /**
     * Nouveau champ enrichi pour Datatourisme.
     */
    images: [
      {
        url: { type: String, required: true },
        title: { type: String, default: null },
        credits: { type: String, default: null },
        rightsStartDate: { type: Date, default: null },
        rightsEndDate: { type: Date, default: null },
        mimeType: { type: String, default: null },
        isMain: { type: Boolean, default: false },
        _id: false,
      },
    ],

    description: String,
    shortDescription: { type: String, default: null },
    longDescription: { type: String, default: null },

    translations: [
      {
        lang: { type: String, required: true },
        title: { type: String },
        description: { type: String },
        shortDescription: { type: String },
        longDescription: { type: String },
        _id: false,
      },
    ],

    externalSource: {
      name: { type: String, default: null }, // ex: "datatourisme"
      id: { type: String, default: null }, // dc:identifier
      url: { type: String, default: null }, // @id
      lastUpdate: { type: Date, default: null },
      lastUpdateDatatourisme: { type: Date, default: null },
    },

    deletedAt: {
      type: Date,
      status: null,
    },

    color: String,
  },
  { timestamps: true },
);

eventSchema.index({
  title: 1,
  address: 1,
  startingDate: 1,
});

eventSchema.index({
  "externalSource.name": 1,
  "externalSource.id": 1,
});

eventSchema.index({
  "location.geo": "2dsphere",
});

const Event = model<IEvent>("Event", eventSchema);
export default Event;
