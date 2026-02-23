import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Owner from "../models/Owner";
import Event from "../models/Event";
import Establishment from "../models/Establishment";

const OwnerIsAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized, no token provided" });
  }

  try {
    const token = auth.replace("Bearer ", "").trim();
    const ownerFinded = await Owner.findOne({ token });

    if (!ownerFinded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    (req as any).owner = ownerFinded;
    (req as any).ownerId = ownerFinded._id;

    req.body.owner = ownerFinded;

    const originalUrl = req.originalUrl || "";
    const parts = originalUrl.split("?")[0].split("/").filter(Boolean);

    // Exemple: /establishment/request-activation/:id
    // parts[0] = "establishment"
    // parts[1] = "request-activation"
    // parts[2] = ":id"
    const resourceType = parts[0]; // "event" | "establishment" | ...
    const ressourceCall = parts[1]; // "create" | "update" | ...
    const resourceId = parts[parts.length - 1]; // souvent l'id (si présent)

    // Si aucune "id" dans l’URL (ex: /establishment/create), on ne bloque pas
    const hasObjectIdInUrl = mongoose.isValidObjectId(resourceId);

    // -----------------------------
    // ✅ CAS EVENT : on garde ta logique PROD (avec guards anti-crash)
    // -----------------------------
    // POST /event/create (ou POST event) : pas de check de propriété
    if (resourceType === "event" && req.method === "POST") {
      return next();
    }

    // Autres méthodes sur event : check appartenance
    if (resourceType === "event" && req.method !== "POST" && hasObjectIdInUrl) {
      const eventFinded = await Event.findById(resourceId).populate(
        "organizer.establishment",
      );

      if (!eventFinded) {
        return res.status(404).json({ error: "Event not found" });
      }

      const establishmentFinded = await Establishment.findOne({
        events: eventFinded._id,
      });

      if (!establishmentFinded) {
        return res.status(404).json({ error: "Establishment not found" });
      }

      const ownerEstablishments: any[] = Array.isArray(
        (ownerFinded as any).establishments,
      )
        ? ((ownerFinded as any).establishments as any[])
        : [];

      const establishmentExists = ownerEstablishments.some((est: any) => {
        // compat: est peut être ObjectId ou doc
        const estId = (est && (est._id || est)) as any;
        return (
          mongoose.isValidObjectId(estId) &&
          new mongoose.Types.ObjectId(estId).equals(
            new mongoose.Types.ObjectId((establishmentFinded as any)._id),
          )
        );
      });

      if (!establishmentExists && ressourceCall !== "create") {
        return res.status(403).json({
          error: "Forbidden, owner does not have access to this event",
        });
      }

      return next();
    }

    // -----------------------------
    // ✅ CAS ESTABLISHMENT : ne pas casser la prod
    // -----------------------------
    // ⚠️ On n’applique PAS de blocage sur les GET pour l’instant (ex: getInformations),
    // sinon tu risques de casser des écrans où l’owner “voit” un établissement avant rattachement.
    //
    // ✅ Par contre, on sécurise les routes “sensibles” (modif/upload/demande activation).
    const isEstablishmentSensitiveCall =
      resourceType === "establishment" &&
      (req.method === "PUT" ||
        // upload-legal-doc et request-activation sont des POST mais “sensibles”
        (req.method === "POST" &&
          ["upload-legal-doc", "request-activation", "update"].includes(
            ressourceCall || "",
          )));

    if (isEstablishmentSensitiveCall) {
      if (!hasObjectIdInUrl) {
        // si pas d’id en URL, on ne bloque pas (ex: /establishment/create)
        return next();
      }

      const establishment = await Establishment.findById(resourceId);
      if (!establishment) {
        return res.status(404).json({ error: "Establishment not found" });
      }

      const ownersArr = Array.isArray((establishment as any).owner)
        ? ((establishment as any).owner as any[])
        : (establishment as any).owner
          ? [(establishment as any).owner]
          : [];

      const isOwner = ownersArr.some(
        (id: any) => String(id) === String(ownerFinded._id),
      );

      if (!isOwner) {
        return res.status(403).json({
          error: "Forbidden, owner does not have access to this establishment",
        });
      }

      return next();
    }

    // -----------------------------
    // ✅ Par défaut : token valide => OK (comportement prod conservé)
    // -----------------------------
    return next();
  } catch (error) {
    console.error("Error during owner authentication:", error);
    return res
      .status(500)
      .json({ error: "Server error during authentication" });
  }
};

export default OwnerIsAuthenticated;
