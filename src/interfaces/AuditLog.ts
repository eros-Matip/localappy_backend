import { Document } from "mongoose";

export default interface IAuditLog extends Document {
  action: String;
  email: String;
  role: String;
  ip: String;
  details: Object;
}
