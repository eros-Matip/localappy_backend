import { model, Schema } from "mongoose";
import ICustomer from "../interfaces/Customer";

const customerSchema = new Schema<ICustomer>({
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
    url: String,
    public_id: String,
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
  establishmentFavorites: [
    { type: Schema.Types.ObjectId, ref: "Etablishment" },
  ], // Référence vers les établissements favoris du client
  token: String,
  hash: String,
  salt: String,
});

const Customer = model<ICustomer>("Customer", customerSchema);
export default Customer;
