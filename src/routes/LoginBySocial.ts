import express, { Request, Response } from "express";
import Customer from "../models/Customer";
import axios from "axios";
const uid2 = require("uid2");
import Retour from "../library/Retour";

const router = express.Router();

router.post("/socialLogin", async (req: Request, res: Response) => {
  const { provider, accessToken } = req.body;

  if (!provider || !accessToken) {
    return res
      .status(400)
      .json({ message: "Provider and accessToken are required" });
  }

  try {
    let userData;

    // Vérification du token en fonction du provider (Google ou Facebook)
    if (provider === "google") {
      const googleResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      );
      userData = googleResponse.data;
    } else if (provider === "facebook") {
      const facebookResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
      );
      userData = facebookResponse.data;
    } else {
      return res.status(400).json({ message: "Invalid provider" });
    }

    // Vérifiez si l'utilisateur existe déjà dans la base de données
    let customer = await Customer.findOne({ email: userData.email }).populate([
      {
        path: "themesFavorites",
        model: "Theme",
      },
      {
        path: "eventsFavorites",
        model: "Event",
      },
    ]);

    // Si l'utilisateur n'existe pas, créez un nouveau compte
    if (!customer) {
      customer = new Customer({
        account: {
          firstname: userData.given_name || userData.name,
          name: userData.family_name || "",
        },
        picture: { url: userData.picture, public_id: "fromGoogle" },
        email: userData.email,
        token: uid2(29),
      });

      await customer.save();
    } else {
      // Si l'utilisateur existe déjà, générez un nouveau token de session
      customer.token = uid2(29);
      await customer.save();
    }

    // Retourner les informations utilisateur et le token
    return res.status(200).json({
      message: "Social login successful",
      customer,
    });
  } catch (error) {
    console.error("Erreur de connexion sociale :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la connexion sociale",
      error,
    });
  }
});

export default router;
