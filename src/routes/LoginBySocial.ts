import express, { Request, Response } from "express";
import Customer from "../models/Customer";
import axios from "axios";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
const uid2 = require("uid2");
import Retour from "../library/Retour";

const router = express.Router();

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

const getKey = (header: any, callback: any) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
};

const verifyAppleToken = (accessToken: string) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      accessToken,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: "https://appleid.apple.com",
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      },
    );
  });
};

router.post("/socialLogin", async (req: Request, res: Response) => {
  const { provider, accessToken, expoPushToken } = req.body;

  if (!provider || !accessToken) {
    Retour.error("Provider and accessToken are required");
    return res
      .status(400)
      .json({ message: "Provider and accessToken are required" });
  }

  try {
    let userData: any;

    // =========================
    // ✅ GOOGLE (stabilisé)
    // =========================
    if (provider === "google") {
      try {
        const tokenInfo = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${accessToken}`,
        );

        userData = {
          email: tokenInfo.data.email,
          given_name: tokenInfo.data.given_name,
          family_name: tokenInfo.data.family_name,
          picture: tokenInfo.data.picture,
          sub: tokenInfo.data.sub,
        };

        // (optionnel mais recommandé) Vérif audience
        if (
          process.env.GOOGLE_WEB_CLIENT_ID &&
          tokenInfo.data.aud !== process.env.GOOGLE_WEB_CLIENT_ID
        ) {
          return res
            .status(401)
            .json({ message: "Invalid Google token audience" });
        }
      } catch (err) {
        // Fallback : access_token (si jamais tu en envoies encore)
        const googleResponse = await axios.get(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
        );
        userData = googleResponse.data;
      }

      if (!userData?.email) {
        return res.status(400).json({ message: "Google token missing email" });
      }
    }

    // =========================
    // ✅ FACEBOOK (email requis)
    // =========================
    else if (provider === "facebook") {
      const facebookResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
      );

      const fb = facebookResponse.data;

      if (!fb?.email) {
        return res.status(400).json({
          message:
            "Facebook account has no email OR permission 'email' not granted",
        });
      }

      const fullName = (fb?.name ?? "").trim();
      const parts = fullName ? fullName.split(" ") : [];
      const given = parts.length ? parts[0] : "Utilisateur";
      const family = parts.length > 1 ? parts.slice(1).join(" ") : "";

      userData = {
        email: fb.email,
        given_name: given,
        family_name: family,
        // (facultatif) tu peux récupérer une photo plus tard via /me/picture si tu veux
        picture: "https://example.com/default-avatar.png",
        sub: fb.id,
      };
    }

    // =========================
    // 🚫 APPLE (inchangé)
    // =========================
    else if (provider === "apple") {
      try {
        const decodedToken: any = await verifyAppleToken(accessToken);
        const { email, sub: appleUserId } = decodedToken;

        if (!email) {
          Retour.error("Apple ID token is missing email");
          return res
            .status(400)
            .json({ message: "Apple ID token is missing email" });
        }

        userData = {
          email,
          appleUserId,
          given_name: decodedToken.given_name || "Utilisateur",
          family_name: decodedToken.family_name || "",
        };
      } catch (err) {
        Retour.error("Invalid Apple ID token");
        return res.status(400).json({ message: "Invalid Apple ID token", err });
      }
    } else {
      Retour.error("Invalid provider");
      return res.status(400).json({ message: "Invalid provider" });
    }

    // =========================
    // CUSTOMER UPSERT
    // =========================
    let customer = await Customer.findOne({ email: userData.email }).populate([
      { path: "themesFavorites", model: "Theme" },
      { path: "eventsReserved", model: "Event" },
      { path: "eventsFavorites", model: "Event" },
      { path: "ownerAccount", model: "Owner", populate: "establishments" },
      { path: "establishmentStaffOf", model: "Establishment" },
    ]);

    if (!customer) {
      customer = new Customer({
        account: {
          firstname: userData.given_name || userData.name || "Utilisateur",
          name: userData.family_name || "",
        },
        picture: {
          url: userData.picture || "https://example.com/default-avatar.png",
          public_id:
            "from" + provider.charAt(0).toUpperCase() + provider.slice(1),
        },
        email: userData.email,
        token: uid2(29),
        expoPushToken: expoPushToken || null,
      });

      await customer.save();
    } else {
      customer.token = uid2(29);
      if (expoPushToken) customer.expoPushToken = expoPushToken;
      await customer.save();
    }

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
