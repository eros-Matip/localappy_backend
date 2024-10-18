import { Request, Response, NextFunction } from "express";
import Customer from "../models/Customer";
const uid2 = require("uid2");

const AdminIsAuthenticated = async (
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
    const CustomerFinded = await Customer.findOne({ token });
    console.log("Token received:", token);

    // Si un utilisateur est trouvé avec ce token
    if (CustomerFinded) {
      // Si la requête est pour "/login", renvoyer les informations directement
      if (isLoginRoute) {
        const newToken: string = uid2(30);
        CustomerFinded.token = newToken;

        // Sauvegarder le nouveau token si modifié
        await CustomerFinded.save();
        return res.status(200).json({
          message: "Token valid",
          customer: CustomerFinded,
        });
      }

      // Pour les autres routes, ajouter l'utilisateur à req.body et passer à la suite
      req.body.admin = CustomerFinded;
      // Vérifier le statut premium si requis par d'autres routes
      if (!CustomerFinded.premiumStatus && !isLoginRoute) {
        return res
          .status(401)
          .json({ error: "Unauthorized, premium status required" });
      }

      return next();
    } else {
      return res.status(401).json({ error: "Invalid token" });
    }
  } else {
    // Si aucune autorisation n'est fournie et que ce n'est pas "/login"
    return res.status(401).json({ error: "Unauthorized, token is required" });
  }
};

export default AdminIsAuthenticated;
