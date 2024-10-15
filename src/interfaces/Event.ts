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
    establishment: {
      type: Types.ObjectId;
      ref: "Establishment";
    };
    legalName: { type: String; default: "Organisateur inconnu" };
    email: { type: String; default: "Email inconnu" };
    phone: { type: String; default: "Téléphone inconnu" };
  };
  image: [String];
  description: String;
  color: String;
}
