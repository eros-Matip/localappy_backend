import { Request, Response, NextFunction } from "express";
import Admin from "../models/Admin"; // Modèle Admin
import Retour from "../library/Retour";
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
    const AdminFinded = await Admin.findOne({ token });

    // Si un admin est trouvé avec ce token
    if (AdminFinded) {
      // Si la requête est pour "/login", renvoyer les informations directement
      if (isLoginRoute) {
        const newToken: string = uid2(30);
        AdminFinded.token = newToken;

        // Sauvegarder le nouveau token si modifié
        await AdminFinded.save();
        Retour.info(
          `Admin ${AdminFinded.account.firstname} ${AdminFinded.account.name} logged by token`
        );
        return res.status(200).json({
          message: "Token valid",
          admin: AdminFinded,
        });
      }

      // Pour les autres routes, ajouter l'admin à req.body et passer à la suite
      req.body.admin = AdminFinded;

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

export default AdminIsAuthenticated;
