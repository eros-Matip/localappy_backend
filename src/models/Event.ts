import { model, Schema } from "mongoose";
import IEvent from "../interfaces/Event";

const eventSchema = new Schema<IEvent>({
  title: String,
  theme: [String],
  startingDate: Date,
  endingDate: Date,
  address: String,
  location: {
    lat: Number,
    lng: Number,
  },
  price: { type: Number, default: 0 },
  priceSpecification: {
    minPrice: Number,
    maxPrice: Number,
    priceCurrency: String,
  },
  favorieds: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
  acceptedPaymentMethod: [String],
  organizer: {
    establishment: { type: Schema.Types.ObjectId, ref: "Establishment" },
    legalName: { type: String, default: "Organisateur inconnu" },
    email: { type: String, default: "Email inconnu" },
    phone: { type: String, default: "Téléphone inconnu" },
  },
  image: [String],
  description: String,
  color: String,
});

const Event = model<IEvent>("Event", eventSchema);
export default Event;
