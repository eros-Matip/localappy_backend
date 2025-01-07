import { Types, Document } from "mongoose";

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
  };
  price: { type: number; default: 0 };
  priceSpecification: {
    minPrice: number;
    maxPrice: number;
    priceCurrency: string;
  };
  favorieds: [{ type: Types.ObjectId; ref: "Customer" }];
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
}
