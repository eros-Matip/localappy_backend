import { Request, Response, NextFunction } from "express";
import Owner from "../models/Owner";
import Event from "../models/Event"; // Assurez-vous que ce modèle est importé
import mongoose from "mongoose";
import Establishment from "../models/Establishment";

const OwnerIsAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Vérifier si un token Bearer est présent dans l'en-tête
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "Unauthorized, no token provided" });
  }

  try {
    // Extraire et nettoyer le token Bearer
    const token = req.headers.authorization.replace("Bearer ", "");

    // Trouver l'Owner correspondant au token
    const ownerFinded = await Owner.findOne({ token: token });

    if (!ownerFinded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Récupérer l'ID de la ressource depuis l'URL
    const resourceId = req.originalUrl.split("/").pop();
    const resourceType = req.originalUrl.split("/")[1];
    const ressourceCall = req.originalUrl.split("/")[2];

    if (!resourceId) {
      return res.status(400).json({ error: "Resource ID not found in URL" });
    }
    console.log("resourceType", resourceType);

    // Si c'est une création d'événement (POST) -> pas besoin de vérifier l'existence d'un événement
    if (resourceType === "event" && req.method === "POST") {
      // Ajouter le propriétaire à la requête
      req.body.owner = ownerFinded;
      return next(); // Passer à l'étape suivante (création de l'événement)
    }
    // Si c'est une création d'événement (POST) -> pas besoin de vérifier l'existence d'un événement
    if (resourceType === "customer" && req.method === "POST") {
      // Ajouter le propriétaire à la requête
      req.body.owner = ownerFinded;
      return next(); // Passer à l'étape suivante (création de l'événement)
    }
    // Pour les autres requêtes (GET, PUT, DELETE) sur un événement
    if (resourceType === "event" && req.method !== "POST") {
      // Vérification si l'événement appartient à l'un des établissements du propriétaire
      const eventFinded = await Event.findById(resourceId).populate(
        "organizer.establishment"
      );

      if (!eventFinded) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Vérifier si l'établissement organisateur de l'événement appartient au propriétaire
      const establishmentFinded = await Establishment.findOne({
        events: eventFinded._id,
      });
      const establishmentExists = ownerFinded.establishments.some(
        (establishment) =>
          (Object(establishment)._id as mongoose.Types.ObjectId).equals(
            Object(establishmentFinded)._id
          )
      );

      if (!establishmentExists && ressourceCall !== "create") {
        return res.status(403).json({
          error: "Forbidden, owner does not have access to this event",
        });
      }
    }

    // Ajout du propriétaire dans le corps de la requête pour les étapes suivantes
    req.body.owner = ownerFinded;

    // Si tout est validé, passer à l'étape suivante
    return next();
  } catch (error) {
    console.error("Error during owner authentication:", error);
    return res
      .status(500)
      .json({ error: "Server error during authentication" });
  }
};

export default OwnerIsAuthenticated;
