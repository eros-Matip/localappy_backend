import { Types, Document } from "mongoose";

export default interface IEstablishment extends Document {
  name: string; // Nom de l’établissement
  type: string; // Type d'activité (café, restaurant, boutique, etc.)
  siret: String;
  address: {
    street: string; // Rue de l’établissement
    city: string; // Ville où se trouve l’établissement
    postalCode: string; // Code postal de l’établissement
    country: string; // Pays de l’établissement
  };
  location: {
    lat: Number;
    lng: Number;
  };
  contact: {
    website?: string; // (Optionnel) Site web de l’établissement
    socialMedia?: { facebook?: string; instagram?: string; twitter?: string }; // (Optionnel) Liens vers les réseaux sociaux
  };
  legalInfo: {
    registrationNumber: string; // Numéro d’immatriculation (SIRET en France)
    insuranceCertificate: string; // Certificat d’assurance responsabilité civile
    KBis: Object;
  };
  owner: { type: Types.ObjectId; ref: "Owner" }; // Référence vers le propriétaire de l’établissement
  events: [{ type: Types.ObjectId; ref: "Event" }]; // Référence vers les événements organisés par l’établissement
}
