import express, { Request, Response } from "express";
import Owner from "../models/Owner";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import twilio from "twilio";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

type OwnerMessageType = "creator_approved";

const normalizeFrenchPhoneNumber = (
  phoneNumber?: string | number,
): string | null => {
  if (!phoneNumber) return null;

  const cleaned = phoneNumber.toString().replace(/\s/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `+33${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("33")) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 9) {
    return `+33${cleaned}`;
  }

  return null;
};

const buildOwnerMessage = ({
  type,
  firstname,
  establishmentName,
}: {
  type: OwnerMessageType;
  firstname?: string;
  establishmentName?: string;
}): string => {
  const safeFirstname = firstname?.trim();
  const safeEstablishmentName = establishmentName?.trim();

  switch (type) {
    case "creator_approved": {
      if (safeFirstname && safeEstablishmentName) {
        return `Bonjour ${safeFirstname}, bonne nouvelle ! Votre établissement ${safeEstablishmentName} a été approuvé sur Localappy. Vous pouvez dès maintenant créer votre premier événement depuis l'application.`;
      }

      if (safeFirstname) {
        return `Bonjour ${safeFirstname}, bonne nouvelle ! Votre compte créateur Localappy et votre établissement ont été approuvés. Vous pouvez dès maintenant créer votre premier événement depuis l'application.`;
      }

      return `Bonne nouvelle ! Votre compte créateur Localappy et votre établissement ont été approuvés. Vous pouvez dès maintenant créer votre premier événement depuis l'application.`;
    }

    default:
      throw new Error("Unsupported owner message type");
  }
};

router.post(
  "/sendOwnerMessage",
  AdminIsAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { ownerId, establishmentId, type } = req.body as {
        ownerId?: string;
        establishmentId?: string;
        type?: OwnerMessageType;
      };

      if (!ownerId) {
        return res.status(400).json({
          success: false,
          message: "ownerId is required",
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          message: "type is required",
        });
      }

      if (type !== "creator_approved") {
        return res.status(400).json({
          success: false,
          message: "Unsupported message type",
        });
      }

      const owner = await Owner.findById(ownerId).populate("establishments");

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Owner not found",
        });
      }

      const phoneNumber = normalizeFrenchPhoneNumber(
        owner.account?.phoneNumber,
      );

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Invalid owner phone number",
        });
      }

      let establishmentName: string | undefined;

      const establishments = owner.establishments as any[];

      if (establishmentId) {
        const establishment = establishments.find(
          (item) => item?._id?.toString() === establishmentId,
        );

        if (!establishment) {
          return res.status(404).json({
            success: false,
            message: "Establishment not found for this owner",
          });
        }

        establishmentName = establishment.name;
      } else if (establishments.length > 0) {
        establishmentName = establishments[0]?.name;
      }

      const body = buildOwnerMessage({
        type,
        firstname: owner.account?.firstname,
        establishmentName,
      });

      await client.messages.create({
        body,
        from: "Localappy",
        to: phoneNumber,
      });

      return res.status(200).json({
        success: true,
        message: "Owner message sent successfully",
      });
    } catch (error) {
      console.error("Error sending owner message:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to send owner message",
        error,
      });
    }
  },
);

export default router;
