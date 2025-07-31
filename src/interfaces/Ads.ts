import { Document, Types } from "mongoose";

export default interface IAd extends Document {
  type: "ad";
  title: string;
  description: string;
  image: string[];
  event: Types.ObjectId;
  clics: {
    source: string;
    date: Date;
  }[];
}
