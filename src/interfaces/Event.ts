import { Types, Document } from "mongoose";

export type ByWhoModel = "Customer" | "Owner";

export interface IEventEntry {
  checkedInAt: Date;
  registration: Types.ObjectId;
  byWho: Types.ObjectId;
  byWhoModel: ByWhoModel;
}

export interface IEventTranslation {
  lang: string; // "fr", "en", "es", "de", "nl", etc.
  title?: string;
  description?: string;
  shortDescription?: string;
}

export default interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  theme: string[];
  startingDate: Date;
  endingDate: Date;
  address: string;
  location: {
    lat: number;
    lng: number;
    geo?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  price: number;
  discount: number;
  priceSpecification: {
    minPrice: number;
    maxPrice: number;
    priceCurrency: string;
  };
  capacity: number;
  registrationOpen: boolean;
  registrations: Types.ObjectId[];
  bills: Types.ObjectId[];
  entries: IEventEntry[];
  favorieds: [
    { customer: { type: Types.ObjectId; ref: "Customer" }; date: Date },
  ];
  clics: {
    source: string;
    date: Date;
  }[];
  acceptedPaymentMethod: string[];
  organizer: {
    establishment: Types.ObjectId;
    legalName: string;
    email: string;
    phone: string;
  };
  image: string[];

  // Texte principal FR
  description: string;
  // 🔥 MULTILINGUE propre et modulable
  translations: IEventTranslation[];

  color: string;
  isDraft: boolean;
}
