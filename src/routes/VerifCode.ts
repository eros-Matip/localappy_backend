import express, { Request, Response } from "express";
import Owner from "../models/Owner";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import Customer from "../models/Customer";
import mongoose from "mongoose";
import twilio from "twilio";

const router = express.Router();

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

router.post(
  "/verifCode",
  OwnerIsAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.body;

      // Rechercher l'Owner par ID
      const owner = await Owner.findById(req.body.owner);
      const customerFinded = await Customer.findById(owner?.customerAccount);

      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }

      if (!customerFinded) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (owner.isVerified) {
        return res.status(404).json({ error: "Owner phone already checked" });
      }

      // Vérifier si le nombre de tentatives est atteint
      if (owner.attempts >= 3) {
        // Générer un nouveau code
        const newVerificationCode = Math.floor(100000 + Math.random() * 900000);
        // Mettre à jour le code et réinitialiser les tentatives
        owner.verificationCode = newVerificationCode;
        owner.attempts = 0;
        await owner.save();

        // Envoyer le nouveau code via SMS
        try {
          await client.messages.create({
            body: `Votre nouveau code de vérification est : ${newVerificationCode}`,
            from: "locaLappy",
            to: `+${owner.account.phoneNumber}`, // Assurez-vous que phoneNumber est en format international
          });

          return res.status(200).json({
            message: "New verification code sent after 3 failed attempts",
          });
        } catch (smsError) {
          console.error("Error sending SMS:", smsError);
          return res.status(500).json({
            error: "Failed to send new verification code",
            details: smsError,
          });
        }
      }

      // Vérifier si le code correspond
      if (owner.verificationCode === parseInt(verificationCode, 10)) {
        customerFinded.ownerAccount = owner._id as mongoose.Types.ObjectId;
        await customerFinded.save();

        owner.isVerified = true;
        owner.verificationCode = null;
        owner.attempts = 0;
        await owner.save();

        return res
          .status(200)
          .json({ message: "Phone number verified successfully" });
      } else {
        // Incrémenter le nombre de tentatives
        owner.attempts += 1;
        await owner.save();

        return res.status(400).json({
          error: "Invalid verification code",
          attempts: owner.attempts,
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: "Failed to verify owner",
        details: error || error,
      });
    }
  }
);

export default router;
