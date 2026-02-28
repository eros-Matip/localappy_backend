import { model, Schema } from "mongoose";
import ICustomer from "../interfaces/Customer";

const customerSchema = new Schema<ICustomer>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },

    account: {
      name: { type: String, trim: true },
      firstname: { type: String, trim: true },
      phoneNumber: { type: Number },
      address: { type: String, trim: true },
      zip: { type: Number },
      city: { type: String, trim: true },
      location: {
        lng: { type: Number },
        lat: { type: Number },
      },
    },

    picture: {
      type: {
        url: { type: String },
        public_id: { type: String },
      },
      required: false,
      default: null,
    },

    descriptif: { type: String, default: "" },

    premiumStatus: { type: Boolean, default: false },

    membership: {
      startDate: { type: Date },
      endDate: { type: Date },
    },

    bills: [{ type: Schema.Types.ObjectId, ref: "Bill" }],

    eventsAttended: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    eventsReserved: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    eventsFavorites: [{ type: Schema.Types.ObjectId, ref: "Event" }],

    themesFavorites: [{ type: Schema.Types.ObjectId, ref: "Theme" }],

    customersFavorites: [{ type: Schema.Types.ObjectId, ref: "Customer" }],

    establishmentFavorites: [
      { type: Schema.Types.ObjectId, ref: "Establishment" },
    ],

    ownerAccount: { type: Schema.Types.ObjectId, ref: "Owner" },

    // ✅ Les établissements dont le customer fait partie du staff
    establishmentStaffOf: [
      { type: Schema.Types.ObjectId, ref: "Establishment" },
    ],

    // ✅ Les invitations staff reçues (en attente / acceptées / refusées)
    establishmentStaffAsking: [
      {
        date: { type: Date, required: true, default: Date.now },
        establishment: {
          type: Schema.Types.ObjectId,
          ref: "Establishment",
          required: true,
        },
        establishmentName: { type: String, required: true },
        role: { type: String, default: "Staff" },
        askedBy: {
          type: Schema.Types.ObjectId,
          ref: "Customer",
          required: true,
        },
        response: { type: Boolean, default: undefined }, // undefined = pas répondu
      },
    ],
    language: {
      type: String,
      enum: ["fr", "en", "es", "de", "it", "eu"],
      default: "fr",
    },
    passwordLosted: {
      status: { type: Boolean, default: false },
      code: { type: String, default: null },
    },

    expoPushToken: { type: String, default: "" },
    token: { type: String, default: "" },
    hash: { type: String, default: "" },
    salt: { type: String, default: "" },
    activated: { type: Boolean, default: true },
    banned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Customer = model<ICustomer>("Customer", customerSchema);
export default Customer;
