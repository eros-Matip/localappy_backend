import { Types, Document } from "mongoose";

export default interface IEvent extends Document {
  title: String;
  theme: [String];
  startingDate: Date;
  endingDate: Date;
  address: String;
  location: {
    lat: Number;
    lng: Number;
  };
  price: { type: Number; default: 0 };
  priceSpecification: {
    minPrice: Number;
    maxPrice: Number;
    priceCurrency: String;
  };
  favorieds: [{ type: Types.ObjectId; ref: "Customer" }];
  acceptedPaymentMethod: [String];
  organizer: {
    establishment: Types.ObjectId;
    legalName: string;
    email: string;
    phone: string;
  };
  image: [String];
  description: String;
  color: String;
}
