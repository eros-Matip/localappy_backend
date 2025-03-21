import { Types, Document } from "mongoose";

export default interface IOwner extends Document {
  email: string;
  account: {
    name: string;
    firstname: string;
    dateOfBirth: Date;
    cityOfBirth: String;
    phoneNumber: number;
  };
  picture: {
    url: string;
    public_id: string;
  };
  cni: {
    url: string;
    public_id: string;
  };
  customerAccount: { type: Types.ObjectId; ref: "Customer" };
  establishments: [{ type: Types.ObjectId; ref: "Establishment" }]; // Référence vers les établissements de l'owner
  isValidated: { type: Boolean; default: false };
  isVerified: boolean; // Champ pour indiquer si le compte est vérifié
  attempts: number; // Ajout du champ pour suivre les tentatives
  verificationCode: string | null;
  expoPushToken: string;
  token: string;
  hash: string;
  salt: string;
  passwordLosted: {
    status: boolean;
    code: string | null;
  };
}
