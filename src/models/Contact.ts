import { model, Schema } from "mongoose";
import IContact from "../interfaces/Contact";

const contactSchema = new Schema<IContact>(
  {
    name: String,
    email: String,
    content: String,
  },
  { timestamps: true }
);

const Contact = model<IContact>("Contact", contactSchema);
export default Contact;
