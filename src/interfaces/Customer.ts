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
  };
  descriptif: string;
  premiumStatus: boolean; // Statut premium du client (adhérent ou non)
  membership: {
    startDate?: Date; // (Optionnel) Date d'adhésion au compte premium
    endDate?: Date; // (Optionnel) Date de fin de l'adhésion premium
  };
  bills: [{ type: Types.ObjectId; ref: "Bill" }];
  eventsAttended: [{ type: Types.ObjectId; ref: "Event" }]; // Référence vers les événements auxquels le client a participé
  eventsFavorites: [
    {
      equals(objectId: Types.ObjectId): unknown;
      type: Types.ObjectId;
      ref: "Event";
    },
  ];
  themesFavorites: [
    {
      equals(objectId: Types.ObjectId): unknown;
      type: Types.ObjectId;
      ref: "Theme";
    },
  ];
  establishmentFavorites: [
    {
      equals(objectId: Types.ObjectId): unknown;
      type: Types.ObjectId;
      ref: "Etablishment";
    },
  ]; // Référence vers les établissements favoris du client
  customersFavorites: [
    {
      equals(objectId: ObjectId): unknown;
      type: Types.ObjectId;
      ref: "Customer";
    },
  ];
  ownerAccount: Types.ObjectId;
  passwordLosted: {
    status: boolean;
    code: string;
  };
  token: string;
  hash: string;
  salt: string;
}
