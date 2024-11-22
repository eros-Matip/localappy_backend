import { Document } from "mongoose";

export default interface IAdmin extends Document {
  email: string;
  account: {
    name: string;
    firstname: string;
    phoneNumber: number;
  };
  token: string;
  hash: string;
  salt: string;
}
