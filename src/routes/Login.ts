import express, { Request, Response } from "express";
import Customer from "../models/Customer";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
import Retour from "../library/Retour";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";
import Owner from "../models/Owner";

const router = express.Router();

// Route POST pour "/login" avec le middleware AdminIsAuthenticated
router.post(
  "/login",
  AdminIsAuthenticated,
  async (req: Request, res: Response) => {
    try {
      // Vérification si le middleware a déjà trouvé un utilisateur via le token
      if (req.body.admin) {
        const customerFindedByToken = await Customer.findById(
          req.body.admin
        ).populate([
          { path: "themesFavorites", model: "Theme" },
          {
            path: "eventsFavorites",
            model: "Event",
          },
          { path: "ownerAccount", model: "Owner" },
        ]);
        // Renvoyer les informations si l'utilisateur est authentifié par token
        return res.status(200).json({
          message: "Logged in with token",
          customer: customerFindedByToken,
        });
      }

      // Si pas de token ou token invalide, procéder à la connexion par email et mot de passe
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Recherche de l'utilisateur par email
      const customerFinded = await Customer.findOne({ email }).populate([
        {
          path: "themesFavorites",
          model: "Theme",
        },
        {
          path: "eventsFavorites",
          model: "Event",
        },
      ]);
      if (!customerFinded) {
        Retour.error("Account was not found");
        return res.status(401).json({ message: "Account was not found" });
      }
      const ownerFinded = await Owner.findById(customerFinded.ownerAccount);

      // Vérification du mot de passe
      const hashToLog = SHA256(password + customerFinded.salt).toString(
        encBase64
      );

      if (hashToLog === customerFinded.hash) {
        Retour.log(
          `${customerFinded.account.firstname} ${customerFinded.account.name} is logged`
        );

        const newToken: string = uid2(29);
        customerFinded.token = newToken;

        if (ownerFinded) {
          ownerFinded.token = newToken;
          await ownerFinded.save();
        }
        // Sauvegarder le nouveau token si modifié
        await customerFinded.save();

        return res.status(200).json({
          message: "Logged in with email and password",
          customer: customerFinded,
        });
      } else {
        Retour.error("Invalid password");
        return res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      Retour.error({ message: "Error caught", error });
      return res.status(500).json({ message: "Error caught", error });
    }
  }
);

export default router;
