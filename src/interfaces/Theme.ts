import { Document } from "mongoose";

export default interface ITheme extends Document {
  theme: string;
  color: string;
  icon: string;
}
