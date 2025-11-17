import { Request, Response, NextFunction } from "express";
import Customer from "../models/Customer";
import Retour from "../library/Retour";
const uid2 = require("uid2");

const CustomerIsAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isLoginRoute = req.originalUrl.split("/").includes("login");

  // Si c'est la route "/login" et qu'il n'y a pas de token, continuer sans vérification
  if (isLoginRoute && !req.headers.authorization) {
    return next();
  }

  // Vérifier la présence du header d'autorisation
  if (!req.headers.authorization) {
    Retour.error("Unauthorized, token is required");
    return res.status(401).json({ error: "Unauthorized, token is required" });
  }

  const token = req.headers.authorization.replace("Bearer ", "");

  try {
    const CustomerFinded = await Customer.findOne({ token }).populate([
      {
        path: "themesFavorites",
        model: "Theme",
      },
      {
        path: "eventsFavorites",
        model: "Event",
      },
      {
        path: "eventsReserved",
        model: "Event",
        populate: "registrations",
      },
      {
        path: "ownerAccount",
        model: "Owner",
        populate: "establishments",
      },
      {
        path: "establishmentStaffOf", // ⚠️ ici ce n'est PAS un tableau
        model: "Establishment",
        select: "name _id",
      },
    ]);

    // Si aucun utilisateur trouvé
    if (!CustomerFinded) {
      Retour.error("Invalid token");
      return res.status(401).json({ error: "Invalid token" });
    }

    // Si la requête est pour "/login", renvoyer les informations directement
    if (isLoginRoute) {
      const newToken: string = uid2(30);
      CustomerFinded.token = newToken;

      // Mettre à jour expoPushToken si fourni
      if (req.body.expoPushToken) {
        CustomerFinded.expoPushToken = req.body.expoPushToken;
      }

      // Sauvegarder le nouveau token
      await CustomerFinded.save();

      Retour.info(
        `Customer ${CustomerFinded.account.firstname} ${CustomerFinded.account.name} logged by token`
      );

      return res.status(200).json({
        message: "Token valid",
        customer: CustomerFinded,
      });
    }

    // -----------------------------
    // 🚀 Détermination des rôles
    // -----------------------------

    // Owner si ownerAccount existe
    const isOwner = !!CustomerFinded.ownerAccount;

    // Staff si establishmentStaffOf est non null
    const staffRef: any = CustomerFinded.establishmentStaffOf;
    const isStaff = !!staffRef; // un seul établissement max

    // Vérifier si staff de l'établissement de la route (si présent)
    const currentEstablishmentId = req.params.establishmentId;
    let isStaffOfThisEstablishment = false;

    if (isStaff && currentEstablishmentId) {
      // cas 1 : on a un ObjectId
      if (staffRef._id) {
        // doc populé
        isStaffOfThisEstablishment =
          staffRef._id.toString() === currentEstablishmentId;
      } else {
        // probablement un ObjectId brut
        isStaffOfThisEstablishment =
          staffRef.toString && staffRef.toString() === currentEstablishmentId;
      }
    }

    // Injecter l'admin dans la requête avec les flags calculés
    req.body.admin = {
      ...CustomerFinded.toObject(),
      isOwner,
      isStaff,
      isStaffOfThisEstablishment,
    };

    return next();
  } catch (error: any) {
    Retour.error("Auth middleware error: " + error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default CustomerIsAuthenticated;
