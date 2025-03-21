import { Schema, model } from "mongoose";
import IAuditLog from "../interfaces/AuditLog";

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: String,
    email: String,
    role: String,
    ip: String,
    details: Object,
  },
  { timestamps: true }
);

const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
