import express, { Request, Response } from "express";
import Customer from "../models/Customer";
import { Expo } from "expo-server-sdk";
import Retour from "../library/Retour";

const router = express.Router();
const expo = new Expo();

router.post("/sendNotification", async (req: Request, res: Response) => {
  const { userId, title, message } = req.body;

  if (!userId || !title || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Trouver l'utilisateur et récupérer son expoPushToken
    const customer = await Customer.findById(userId);
    if (!customer || !customer.expoPushToken) {
      return res
        .status(404)
        .json({ message: "User or ExpoPushToken not found" });
    }

    const pushToken = customer.expoPushToken;

    // Vérifier si le token est valide
    if (!Expo.isExpoPushToken(pushToken)) {
      return res.status(400).json({ message: "Invalid Expo push token" });
    }

    // Construire le message
    const notificationMessage = {
      to: pushToken,
      sound: "default",
      title,
      body: message,
      data: { userId },
    };

    // Envoyer la notification via Expo
    const receipt = await expo.sendPushNotificationsAsync([
      notificationMessage,
    ]);

    Retour.info("Notification sent successfully");
    return res.status(200).json({ message: "Notification sent", receipt });
  } catch (error) {
    Retour.error("Failed to send notification");
    return res
      .status(500)
      .json({ message: "Failed to send notification", error });
  }
});

export default router;
