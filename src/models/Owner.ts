import { model, Schema } from "mongoose";
import IOwner from "../interfaces/Owner";

const OwnerSchema = new Schema<IOwner>(
  {
    email: { type: String, required: true, unique: true },
    account: {
      name: { type: String, required: true },
      firstname: { type: String, required: true },
      phoneNumber: { type: Number, required: true },
    },
    establishments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Establishment",
      },
    ],
    picture: {
      url: String,
      public_id: String,
    },
    cni: {
      url: String,
      public_id: String,
    },
    customerAccount: { type: Schema.Types.ObjectId, ref: "Customer" },
    isValidated: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false }, // Champ pour indiquer si le compte est vérifié
    attempts: { type: Number, default: 0 },
    verificationCode: { type: String, default: null },
    token: { type: String }, // Optionnel, par exemple pour stocker un token JWT
    hash: { type: String, required: true }, // Hash du mot de passe, requis pour l'authentification
    salt: { type: String, required: true }, // Salt pour sécuriser le hash du mot de passe
    passwordLosted: {
      status: { type: Boolean, default: false },
      code: { type: String },
    },
  },
  { timestamps: true }
);

const Owner = model<IOwner>("Owner", OwnerSchema);

export default Owner;
