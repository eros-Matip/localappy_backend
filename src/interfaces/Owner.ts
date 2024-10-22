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
  establishments: [{ type: Types.ObjectId; ref: "Establishment" }]; // Référence vers les établissements de l'owner
  isValidated: { type: Boolean; default: false };
  token: string;
  hash: string;
  salt: string;
}
