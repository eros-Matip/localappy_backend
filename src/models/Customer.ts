import { model, Schema } from "mongoose";
import ICustomer from "../interfaces/Customer";

const customerSchema = new Schema<ICustomer>(
  {
    email: String,
    account: {
      name: String,
      firstname: String,
      phoneNumber: Number,
      address: String,
      zip: Number,
      city: String,
      location: {
        lng: Number,
        lat: Number,
      },
    },
    picture: {
      type: {
        url: { type: String },
        public_id: { type: String },
      },
      required: false,
    },
    descriptif: String,
    premiumStatus: { type: Boolean, default: false }, // Statut premium du client (adhérent ou non)
    membership: {
      startDate: Date, // (Optionnel) Date d'adhésion au compte premium
      endDate: Date, // (Optionnel) Date de fin de l'adhésion premium
    },
    bills: [{ type: Schema.Types.ObjectId, ref: "Bill" }],
    eventsAttended: [{ type: Schema.Types.ObjectId, ref: "Event" }], // Référence vers les événements auxquels le client a participé
    eventsFavorites: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    themesFavorites: [{ type: Schema.Types.ObjectId, ref: "Theme" }],
    customersFavorites: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
    establishmentFavorites: [
      { type: Schema.Types.ObjectId, ref: "Etablishment" },
    ], // Référence vers les établissements favoris du client
    ownerAccount: { type: Schema.Types.ObjectId, ref: "Owner" },
    passwordLosted: {
      status: { type: Boolean, default: false },
      code: { type: String },
    },
    expoPushToken: String,
    token: String,
    hash: String,
    salt: String,
  },
  { timestamps: true }
);

const Customer = model<ICustomer>("Customer", customerSchema);
export default Customer;
