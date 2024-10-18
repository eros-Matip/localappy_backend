import { Schema, model } from "mongoose";
import ITheme from "../interfaces/Theme";

const themeSchema = new Schema<ITheme>({
  theme: String,
  color: String,
  icon: String,
});

const Theme = model<ITheme>("Theme", themeSchema);
export default Theme;
