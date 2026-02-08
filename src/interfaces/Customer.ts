import { ObjectId } from "bson";
import { Types } from "mongoose";
import { Document } from "mongoose";

export interface IEstablishmentStaffInvitation {
  _id?: Types.ObjectId;
  date: Date;
  establishment: Types.ObjectId;
  establishmentName: string;
  role?: string;
  askedBy?: Types.ObjectId;
  response?: boolean; // undefined = en attente, true = accepté, false = refusé
}

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

  premiumStatus: boolean;

  membership: {
    startDate?: Date;
    endDate?: Date;
  };

  bills: Types.ObjectId[];

  eventsAttended: Types.ObjectId[];
  eventsReserved: Types.ObjectId[];
  eventsFavorites: Types.ObjectId[];
  themesFavorites: Types.ObjectId[];

  establishmentFavorites: Types.ObjectId[];
  customersFavorites: Types.ObjectId[];

  /** 🏢 OWNER */
  ownerAccount?: Types.ObjectId | null;

  /** 👥 STAFF – invitations reçues */
  establishmentStaffAsking: IEstablishmentStaffInvitation[];

  /** 👥 STAFF – établissements dont le customer fait partie */
  establishmentStaffOf: Types.ObjectId[];
  language: string;
  passwordLosted: {
    status: boolean;
    code: string | null;
  };
  expoPushToken?: string;
  token: string;
  hash: string;
  salt: string;
}
