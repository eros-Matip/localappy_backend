import { Types, Document } from "mongoose";

export type ByWhoModel = "Customer" | "Owner";

export interface IEventEntry {
  checkedInAt: Date;
  registration: Types.ObjectId; // ref: "Registration"
  byWho: Types.ObjectId; // refPath: byWhoModel -> "Customer" | "Owner"
  byWhoModel: ByWhoModel;
}

export default interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  theme: string[];
  startingDate: Date;
  endingDate: Date;
  address: string;
  location: {
    lat: number; // Latitude pour compatibilité avec l'ancien format
    lng: number; // Longitude pour compatibilité avec l'ancien format
    geo?: {
      // Champ géospatial (facultatif pour éviter de casser l'ancien code)
      type: "Point";
      coordinates: [number, number]; // [longitude, latitude]
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
  description: string;
  color: string;
  isDraft: boolean;
}
