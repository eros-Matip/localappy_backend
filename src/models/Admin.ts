import { model, Schema } from "mongoose";
import IAdmin from "../interfaces/Admin";

const adminSchema = new Schema<IAdmin>(
  {
    email: String,
    account: {
      name: String,
      firstname: String,
      phoneNumber: Number,
    },
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

const Admin = model<IAdmin>("Admin", adminSchema);
export default Admin;
