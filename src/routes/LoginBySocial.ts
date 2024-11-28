import express, { Request, Response } from "express";
import Customer from "../models/Customer";
import axios from "axios";
import jwt from "jsonwebtoken"; // Pour décoder le token d'Apple
const uid2 = require("uid2");
import Retour from "../library/Retour";

const router = express.Router();

router.post("/socialLogin", async (req: Request, res: Response) => {
  const { provider, accessToken, idToken } = req.body;

  if (!provider || (!accessToken && !idToken)) {
    Retour.error("Provider and accessToken or idToken are required");
    return res
      .status(400)
      .json({ message: "Provider and accessToken or idToken are required" });
  }

  try {
    let userData: any;

    // Vérification du token en fonction du provider (Google, Facebook ou Apple)
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
    } else if (provider === "apple") {
      // Décodage du idToken fourni par Apple
      const decodedToken = jwt.decode(idToken, { complete: true });

      if (!decodedToken) {
        Retour.error("Invalid Apple ID token");
        return res.status(400).json({ message: "Invalid Apple ID token" });
      }

      const { email, sub: appleUserId } = decodedToken.payload;

      if (!email) {
        Retour.error("Apple ID token is missing email");

        return res
          .status(400)
          .json({ message: "Apple ID token is missing email" });
      }

      userData = {
        email,
        appleUserId,
        given_name: decodedToken.payload.given_name || "Utilisateur",
        family_name: decodedToken.payload.family_name || "",
      };
    } else {
      Retour.error("Invalid provider");
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
      { path: "ownerAccount", model: "Owner" },
    ]);

    // Si l'utilisateur n'existe pas, créez un nouveau compte
    if (!customer) {
      customer = new Customer({
        account: {
          firstname: userData.given_name || userData.name,
          name: userData.family_name || "",
        },
        picture: {
          url: userData.picture || null, // Apple ne fournit pas d'image
          public_id:
            "from" + provider.charAt(0).toUpperCase() + provider.slice(1),
        },
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
    Retour.info("Social login successful");
    return res.status(200).json({
      message: "Social login successful",
      customer,
    });
  } catch (error) {
    Retour.error("Erreur de connexion sociale");
    return res.status(500).json({
      message: "Une erreur est survenue lors de la connexion sociale",
      error,
    });
  }
});

export default router;
