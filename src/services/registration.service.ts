import Registration from "../models/Registration";
import { Types } from "mongoose";

/**
 * Valide une réservation (Registration) et la marque comme "checked-in".
 * - Fonction appelée lors d'un scan de ticket.
 * - Pas de vérification de token ici : on considère que c'est déjà fait en amont.
 */
export async function validateRegistrationAndCheckIn(params: {
  registrationId?: string;
  ticketNumber?: string;
  merchantId: string;
}) {
  const { registrationId, ticketNumber, merchantId } = params;

  // Recherche de la registration par ID ou numéro de ticket
  const query: any = {};
  if (registrationId) query._id = registrationId;
  if (ticketNumber) query.ticketNumber = ticketNumber;

  const reg = await Registration.findOne(query);
  if (!reg) {
    throw new Error("REGISTRATION_NOT_FOUND");
  }

  // Idempotence : si déjà check-in
  if (reg.checkInStatus === "checked-in") {
    return { code: "ALREADY_SCANNED" as const, registration: reg };
  }

  // Optionnel : ne check-in que si payé ou confirmé
  const allowedStatuses = ["paid", "confirmed"];
  if (!allowedStatuses.includes(reg.status)) {
    throw new Error("REGISTRATION_NOT_ELIGIBLE");
  }

  // Mise à jour du statut
  reg.checkInStatus = "checked-in";

  // Champs additionnels si présents dans ton modèle
  (reg as any).checkedInAt = new Date();
  (reg as any).checkedInBy = new Types.ObjectId(merchantId);

  await reg.save();

  return { code: "OK" as const, registration: reg };
}
