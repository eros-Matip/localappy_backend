import express, { Request, Response } from "express";
import Customer from "../models/Customer";
import axios from "axios";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
const uid2 = require("uid2");
import Retour from "../library/Retour";
import { trackLoginStat } from "../library/TrackloginStat";

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
const facebookClient = jwksClient({
  jwksUri: "https://www.facebook.com/.well-known/oauth/openid/jwks/",
});

const getFacebookKey = (header: any, callback: any) => {
  facebookClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
};

const verifyFacebookAuthenticationToken = (authenticationToken: string) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      authenticationToken,
      getFacebookKey,
      {
        algorithms: ["RS256"],
        audience: "503623619325287",
        issuer: "https://www.facebook.com",
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      },
    );
  });
};
router.post("/socialLogin", async (req: Request, res: Response) => {
  const { provider, accessToken, tokenType, expoPushToken } = req.body;

  if (!provider || !accessToken) {
    Retour.error("Provider and accessToken are required");
    return res
      .status(400)
      .json({ message: "Provider and accessToken are required" });
  }

  try {
    let userData: any;

    // =========================
    // ✅ GOOGLE
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

        if (
          process.env.GOOGLE_WEB_CLIENT_ID &&
          tokenInfo.data.aud !== process.env.GOOGLE_WEB_CLIENT_ID
        ) {
          return res
            .status(401)
            .json({ message: "Invalid Google token audience" });
        }
      } catch (err) {
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
    // ✅ FACEBOOK
    // =========================
    else if (provider === "facebook") {
      if (tokenType === "authentication_token") {
        try {
          const decodedToken: any =
            await verifyFacebookAuthenticationToken(accessToken);

          console.log("FACEBOOK LIMITED TOKEN DECODED =", decodedToken);

          const facebookUserId = decodedToken.sub;
          const email = decodedToken.email;

          if (!facebookUserId) {
            return res.status(400).json({
              message: "Facebook authentication token missing sub",
            });
          }

          if (!email) {
            return res.status(400).json({
              message:
                "Facebook Limited Login token missing email. Impossible de créer le compte sans email.",
            });
          }

          userData = {
            email,
            given_name:
              decodedToken.given_name ||
              decodedToken.name?.split(" ")?.[0] ||
              "Utilisateur",
            family_name:
              decodedToken.family_name ||
              decodedToken.name?.split(" ")?.slice(1).join(" ") ||
              "",
            picture:
              decodedToken.picture || "https://example.com/default-avatar.png",
            sub: facebookUserId,
          };
        } catch (error: any) {
          console.log("FACEBOOK LIMITED TOKEN ERROR =", error?.message);

          return res.status(400).json({
            message: "Invalid Facebook authentication token",
            error: error?.message,
          });
        }
      } else {
        try {
          const facebookResponse = await axios.get(
            "https://graph.facebook.com/v20.0/me",
            {
              params: {
                fields: "id,name,email",
                access_token: accessToken,
              },
            },
          );

          const fb = facebookResponse.data;

          console.log("FACEBOOK ME RESPONSE =", fb);

          if (!fb?.id) {
            return res.status(400).json({
              message: "Facebook token invalid: missing id",
            });
          }

          if (!fb?.email) {
            return res.status(400).json({
              message:
                "Facebook account has no email OR permission 'email' not granted",
              facebookUser: {
                id: fb.id,
                name: fb.name,
              },
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
            picture: `https://graph.facebook.com/${fb.id}/picture?type=large`,
            sub: fb.id,
          };
        } catch (error: any) {
          console.log("FACEBOOK ME ERROR STATUS =", error?.response?.status);
          console.log("FACEBOOK ME ERROR DATA =", error?.response?.data);
          console.log("FACEBOOK ME ERROR MESSAGE =", error?.message);

          return res.status(400).json({
            message: "Invalid Facebook access token",
            facebookError: error?.response?.data || error?.message,
          });
        }
      }
    }
    // =========================
    // 🚫 APPLE
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
    await trackLoginStat({
      role: "customer",
    });
    Retour.info(
      `${customer.account.firstname} ${customer.account.name} logged by Social login`,
    );
    return res.status(200).json({
      message: "Social login successful",
      customer,
    });
  } catch (error: any) {
    Retour.error("Erreur de connexion sociale");

    console.log("SOCIAL LOGIN ERROR STATUS =", error?.response?.status);
    console.log("SOCIAL LOGIN ERROR DATA =", error?.response?.data);
    console.log("SOCIAL LOGIN ERROR MESSAGE =", error?.message);

    return res.status(500).json({
      message: "Une erreur est survenue lors de la connexion sociale",
      error: error?.response?.data || error?.message,
    });
  }
});

export default router;
