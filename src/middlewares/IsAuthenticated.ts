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
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace("Bearer ", "");

    const CustomerFinded = await Customer.findOne({ token }).populate([
      {
        path: "themesFavorites",
        model: "Theme",
      },
      {
        path: "eventsFavorites",
        model: "Event",
      },
      { path: "ownerAccount", model: "Owner", populate: "establishments" },
    ]);

    // Si un utilisateur est trouvé avec ce token
    if (CustomerFinded) {
      // Si la requête est pour "/login", renvoyer les informations directement
      if (isLoginRoute) {
        const newToken: string = uid2(30);
        CustomerFinded.token = newToken;

        // Mettre à jour expoPushToken si fourni
        if (req.body.expoPushToken) {
          CustomerFinded.expoPushToken = req.body.expoPushToken;
        }

        // Sauvegarder le nouveau token si modifié
        await CustomerFinded.save();
        Retour.info(
          `Customer ${CustomerFinded.account.firstname} ${CustomerFinded.account.name} logged by token `
        );
        return res.status(200).json({
          message: "Token valid",
          customer: CustomerFinded,
        });
      }

      // Pour les autres routes, ajouter l'utilisateur à req.body et passer à la suite
      req.body.admin = CustomerFinded;

      // Vérifier le statut premium si requis par d'autres routes
      // if (!CustomerFinded.premiumStatus && !isLoginRoute) {
      //   Retour.warn("Unauthorized, premium status required");
      //   return res
      //     .status(401)
      //     .json({ error: "Unauthorized, premium status required" });
      // }

      return next();
    } else {
      Retour.error("Invalid token");
      return res.status(401).json({ error: "Invalid token" });
    }
  } else {
    // Si aucune autorisation n'est fournie et que ce n'est pas "/login"
    Retour.error("Unauthorized, token is required");
    return res.status(401).json({ error: "Unauthorized, token is required" });
  }
};

export default CustomerIsAuthenticated;
