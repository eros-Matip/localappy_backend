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

const verifyAppleToken = (idToken: string) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: "https://appleid.apple.com",
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
};

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
    console.log("provider", provider);
    console.log("idToken", idToken);

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
      try {
        const decodedToken: any = await verifyAppleToken(idToken);
        const { email, sub: appleUserId } = decodedToken;

        console.log("email", email);
        console.log("appleUserId", appleUserId);
        console.log("decodedToken", decodedToken);

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

    let customer = await Customer.findOne({ email: userData.email }).populate([
      { path: "themesFavorites", model: "Theme" },
      { path: "eventsFavorites", model: "Event" },
      { path: "ownerAccount", model: "Owner" },
    ]);

    if (!customer) {
      customer = new Customer({
        account: {
          firstname: userData.given_name || userData.name,
          name: userData.family_name || "",
        },
        picture: {
          url: userData.picture || "https://example.com/default-avatar.png",
          public_id:
            "from" + provider.charAt(0).toUpperCase() + provider.slice(1),
        },
        email: userData.email,
        token: uid2(29),
      });

      await customer.save();
    } else {
      customer.token = uid2(29);
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
