import express, { Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
import Retour from "../library/Retour";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";

import Customer from "../models/Customer";
import Owner from "../models/Owner";
import Admin from "../models/Admin";

const router = express.Router();

router.post(
  "/login",
  AdminIsAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { email, password, newPassword, expoPushToken } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // 🔍 Recherche des utilisateurs
      const [customerFinded, adminFinded, ownerFinded] = await Promise.all([
        Customer.findOne({ email }).populate([
          { path: "themesFavorites", model: "Theme" },
          { path: "eventsFavorites", model: "Event" },
          { path: "ownerAccount", model: "Owner", populate: "establishments" },
        ]),
        Admin.findOne({ email }),
        Owner.findOne({ email }),
      ]);

      // ✅ Vérification si le compte existe
      if (!customerFinded && !adminFinded && !ownerFinded) {
        Retour.error("Account was not found");
        return res.status(401).json({ message: "Account was not found" });
      }

      // 🔹 Détection de l'utilisateur correspondant
      const userFinded = customerFinded || adminFinded || ownerFinded;

      // ✅ Vérification si l'utilisateur utilise le code "passwordLosted.code"
      if (
        userFinded &&
        userFinded.passwordLosted?.status === true &&
        password === userFinded.passwordLosted.code
      ) {
        if (!newPassword) {
          return res.status(400).json({
            message: "New password is required to reset your password",
          });
        }

        // 🔹 Générer un nouveau salt et hash
        const newSalt = uid2(16);
        const newHash = SHA256(newPassword + newSalt).toString(encBase64);

        // 🔹 Mettre à jour le modèle avec le nouveau mot de passe
        userFinded.salt = newSalt;
        userFinded.hash = newHash;
        userFinded.passwordLosted.status = false; // Désactivation après modification
        userFinded.passwordLosted.code = null;

        await userFinded.save();

        Retour.log(`Mot de passe mis à jour pour ${userFinded.email}`);

        return res.status(200).json({
          message: "Password has been successfully updated.",
        });
      }

      // 🔹 Vérification du mot de passe normal
      const hashToLog = userFinded
        ? SHA256(password + userFinded.salt).toString(encBase64)
        : null;

      if (userFinded && hashToLog && hashToLog === userFinded.hash) {
        Retour.log(
          `${userFinded.account.firstname} ${userFinded.account.name} is logged`
        );

        const newToken: string = uid2(26);
        userFinded.token = newToken;

        if (expoPushToken) {
          userFinded.expoPushToken = expoPushToken;
        }

        await userFinded.save();

        return res.status(200).json({
          message: "Logged in with email and password",
          user: userFinded,
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
