import { model, Schema } from "mongoose";
import IOwner from "../interfaces/Owner";

const OwnerSchema = new Schema<IOwner>({
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
  isValidated: { type: Boolean, default: false },
  token: { type: String }, // Optionnel, par exemple pour stocker un token JWT
  hash: { type: String, required: true }, // Hash du mot de passe, requis pour l'authentification
  salt: { type: String, required: true }, // Salt pour sécuriser le hash du mot de passe
});

const Owner = model<IOwner>("Owner", OwnerSchema);

export default Owner;
