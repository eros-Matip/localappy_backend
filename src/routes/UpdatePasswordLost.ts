import express, { NextFunction, Request, Response } from "express";
import Retour from "../library/Retour";
import Customer from "../models/Customer";
import Owner from "../models/Owner";
import Admin from "../models/Admin";
import { MailerSend, Sender, Recipient, EmailParams } from "mailersend";

const router = express.Router();

router.post(
  "/updatePasswordLosted",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!process.env.MAILERSEND_KEY) {
        throw new Error(
          "MAILERSEND_KEY est manquant dans les variables d'environnement.",
        );
      }

      const mailerSend = new MailerSend({
        apiKey: process.env.MAILERSEND_KEY,
      });

      const sender = new Sender("noreply@localappy.fr", "Localappy Support");

      const email = req.body.email;

      // 🔍 Recherche dans les modèles
      const customerFinded = await Customer.findOne({ email });
      const ownerFinded = await Owner.findOne({ email });
      const adminFinded = await Admin.findOne({ email });

      // Vérification si un utilisateur existe
      const utilisateurFinded = customerFinded || ownerFinded || adminFinded;

      if (!utilisateurFinded) {
        Retour.info("Utilisateur introuvable");
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      // ✅ Génération du mot de passe temporaire
      const randomStr = (len: number, arr: string): string => {
        let ans = "";
        for (let i = len; i > 0; i--) {
          ans += arr[Math.floor(Math.random() * arr.length)];
        }
        return ans;
      };

      const newPassword = randomStr(
        9,
        "1234567890abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
      );

      // ✅ Mise à jour du mot de passe temporaire
      utilisateurFinded.passwordLosted = utilisateurFinded.passwordLosted || {};
      utilisateurFinded.passwordLosted.status = true;
      utilisateurFinded.passwordLosted.code = newPassword;

      await utilisateurFinded.save();

      // ✅ Envoi de l'email
      const recipient = new Recipient(
        utilisateurFinded.email,
        utilisateurFinded.email,
      );
      const personalization = [
        {
          email: utilisateurFinded.email,
          data: {
            code: newPassword,
          },
        },
      ];

      const emailParams = new EmailParams()
        .setFrom(sender)
        .setTo([recipient])
        .setSubject("Réinitialisation de votre mot de passe")
        .setTemplateId("neqvygm5v3z40p7w")
        .setPersonalization(personalization);

      await mailerSend.email.send(emailParams);

      return res
        .status(200)
        .json({ message: "Un nouveau mot de passe a été envoyé par email." });
    } catch (error) {
      Retour.info({ message: "Erreur attrapée", error });
      return res
        .status(500)
        .json({ message: "Une erreur est survenue.", error });
    }
  },
);

export default router;
