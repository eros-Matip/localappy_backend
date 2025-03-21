import AuditLog from "../models/AuditLog";

export const logAudit = async ({
  action,
  email,
  role,
  ip,
  details = {},
}: {
  action: string;
  email: string;
  role?: string;
  ip?: string;
  details?: any;
}) => {
  try {
    await AuditLog.create({ action, email, role, ip, details });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement du log :", err);
  }
};
