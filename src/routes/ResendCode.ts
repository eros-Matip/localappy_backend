import express, { Request, Response } from "express";
import Owner from "../models/Owner";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import twilio from "twilio";

const router = express.Router();

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

router.post(
  "/resendCode",
  OwnerIsAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const owner = await Owner.findById(req.body.owner);

      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }

      if (owner.isVerified) {
        return res.status(400).json({ error: "Owner phone already verified" });
      }

      // Générer un nouveau code de vérification
      const newVerificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      owner.verificationCode = newVerificationCode;
      owner.attempts = 0; // Réinitialiser les tentatives
      await owner.save();

      // Envoyer le nouveau code via SMS
      try {
        await client.messages.create({
          body: `Votre nouveau code de vérification est : ${newVerificationCode}`,
          from: "Localappy",
          to: `+33${owner.account.phoneNumber}`,
        });

        return res
          .status(200)
          .json({ message: "New verification code sent successfully" });
      } catch (smsError) {
        console.error("Error sending SMS:", smsError);
        return res.status(500).json({
          error: "Failed to send verification code",
          details: smsError,
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to resend verification code", details: error });
    }
  }
);

export default router;
