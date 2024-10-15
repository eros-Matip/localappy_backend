import { Types } from "mongoose";
import { Document } from "mongoose";

export default interface ICustomer extends Document {
  email: string;
  account: {
    name: string;
    firstname: string;
    phoneNumber: number;
    address: string;
    zip: number;
    city: string;
    location: {
      lng: number;
      lat: number;
    };
  };
  premiumStatus: boolean; // Statut premium du client (adhérent ou non)
  membership: {
    startDate?: Date; // (Optionnel) Date d'adhésion au compte premium
    endDate?: Date; // (Optionnel) Date de fin de l'adhésion premium
  };
  bills: [{ type: Types.ObjectId; ref: "Bill" }];
  eventsAttended: [{ type: Types.ObjectId; ref: "Event" }]; // Référence vers les événements auxquels le client a participé
  eventsFavorites: [{ type: Types.ObjectId; ref: "Event" }];
  favorites: [{ type: Types.ObjectId; ref: "Etablishment" }]; // Référence vers les établissements favoris du client
  token: string;
  hash: string;
  salt: string;
}
