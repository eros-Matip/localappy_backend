import { ObjectId } from "bson";
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
  picture: {
    url: string;
    public_id: string;
  } | null;
  descriptif: string;
  premiumStatus: boolean; // Statut premium du client (adhérent ou non)
  membership: {
    startDate?: Date; // (Optionnel) Date d'adhésion au compte premium
    endDate?: Date; // (Optionnel) Date de fin de l'adhésion premium
  };
  bills: Types.ObjectId[];
  eventsAttended: Types.ObjectId[]; // Référence vers les événements auxquels le client a participé
  eventsReserved: Types.ObjectId[];
  eventsFavorites: Types.ObjectId[];
  themesFavorites: Types.ObjectId[];
  establishmentFavorites: Types.ObjectId[]; // Référence vers les établissements favoris du client
  customersFavorites: Types.ObjectId[];
  ownerAccount: Types.ObjectId;
  passwordLosted: {
    status: boolean;
    code: string | null;
  };
  expoPushToken: string;
  token: string;
  hash: string;
  salt: string;
}
