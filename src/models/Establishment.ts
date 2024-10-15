import { model, Schema } from "mongoose";
import IEstablishment from "../interfaces/Establishment";

const EstablishmentSchema = new Schema<IEstablishment>({
  name: String, // Nom de l’établissement
  type: String, // Type d'activité (café, restaurant, boutique, etc.)
  siret: String,
  address: {
    street: String, // Rue de l’établissement
    city: String, // Ville où se trouve l’établissement
    postalCode: String, // Code postal de l’établissement
    country: String, // Pays de l’établissement
  },
  location: {
    lat: Number,
    lng: Number,
  },
  contact: {
    website: String, // (Optionnel) Site web de l’établissement
    socialMedia: { facebook: String, instagram: String, twitter: String }, // (Optionnel) Liens vers les réseaux sociaux
  },
  legalInfo: {
    registrationNumber: String, // Numéro d’immatriculation (SIRET en France)
    insuranceCertificate: String, // Certificat d’assurance responsabilité civile
    KBis: Object,
  },
  owner: { type: Schema.Types.ObjectId, ref: "Owner" }, // Référence vers le propriétaire de l’établissement
  events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
});

const Establishment = model<IEstablishment>(
  "Establishment",
  EstablishmentSchema
);

export default Establishment;
