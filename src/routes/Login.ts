import express, { Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
import Retour from "../library/Retour";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";

import Customer from "../models/Customer";
import Owner from "../models/Owner";
import Admin from "../models/Admin";
import { logAudit } from "../library/LogAudit";

const router = express.Router();

/**
 * ✅ IP plus fiable derrière proxy (Heroku / Nginx / Cloudflare)
 * (Pense à mettre app.set("trust proxy", 1) dans ton app.ts/server.ts)
 */
const getClientIp = (req: Request) => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  if (Array.isArray(xff)) return xff[0];
  return req.ip;
};

/**
 * ✅ Contexte de requête pour logs (sans données sensibles)
 */
const buildLogContext = (req: Request, extras?: Record<string, any>) => {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"];
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  const host = req.headers["host"];

  // ⚠️ Ne JAMAIS logger password / newPassword / token / code
  const context = {
    ts: new Date().toISOString(),
    endpoint: `${req.method} ${req.originalUrl}`,
    ip,
    forwardedFor: req.headers["x-forwarded-for"],
    realIp: req.headers["x-real-ip"],
    host,
    origin,
    referer,
    userAgent,
    // utile si Cloudflare (sinon undefined)
    cf: {
      country: req.headers["cf-ipcountry"],
      ray: req.headers["cf-ray"],
      connectingIp: req.headers["cf-connecting-ip"],
    },
    // infos client "hors sécurité" mais utiles pour comprendre d'où vient la connexion
    client: {
      expoPushTokenProvided: Boolean((req as any)?.body?.expoPushToken),
      // si tu veux, tu peux envoyer ces champs depuis l’app plus tard
      platform: (req as any)?.body?.platform, // "ios" | "android" | ...
      appVersion: (req as any)?.body?.appVersion,
      buildNumber: (req as any)?.body?.buildNumber,
      deviceName: (req as any)?.body?.deviceName,
    },
    ...extras,
  };

  return context;
};

router.post(
  "/login",
  AdminIsAuthenticated,
  async (req: Request, res: Response) => {
    // ✅ requestId pour corréler tous les logs de CETTE requête
    const requestId = uid2(10);

    try {
      const { email, password, newPassword, expoPushToken } = req.body;

      const baseContext = buildLogContext(req, {
        requestId,
        emailProvided: Boolean(email),
      });

      if (!email || !password) {
        Retour.error("LOGIN_FAILED missing_email_or_password", {
          ...baseContext,
          reason: "Email and password are required",
        });

        await logAudit({
          action: "login_failed",
          email,
          ip: getClientIp(req),
          details: { reason: "Email and password are required", requestId },
        });

        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // 🔍 Recherche des utilisateurs
      const [customerFinded, adminFinded, ownerFinded] = await Promise.all([
        Customer.findOne({ email }).populate([
          { path: "themesFavorites", model: "Theme" },
          { path: "eventsFavorites", model: "Event" },
          { path: "eventsReserved", model: "Event", populate: "registrations" },
          { path: "ownerAccount", model: "Owner", populate: "establishments" },
          { path: "establishmentStaffOf", model: "Establishment" },
        ]),
        Admin.findOne({ email }),
        Owner.findOne({ email }),
      ]);

      // ✅ Vérification si le compte existe
      if (!customerFinded && !adminFinded && !ownerFinded) {
        const msg = `Account with this mail: "${email}" was not found`;

        Retour.error("LOGIN_FAILED account_not_found", {
          ...baseContext,
          email,
          reason: msg,
        });

        await logAudit({
          action: "login_failed",
          email,
          ip: getClientIp(req),
          details: { reason: msg, requestId },
        });

        return res.status(401).json({
          message: msg,
        });
      }

      // 🔹 Détection de l'utilisateur correspondant
      const userFinded = customerFinded || adminFinded || ownerFinded;

      // 🆕 Déterminer le rôle
      let role = "";
      if (adminFinded) role = "admin";
      else if (ownerFinded) role = "owner";
      else if (customerFinded) role = "customer";

      const userContext = buildLogContext(req, {
        requestId,
        email: userFinded?.email,
        role,
        userId: userFinded?._id?.toString?.(),
      });

      // ✅ Vérification avec le code temporaire "passwordLosted.code"
      if (
        userFinded &&
        userFinded.passwordLosted?.status === true &&
        password === userFinded.passwordLosted.code
      ) {
        if (!newPassword) {
          Retour.error("PASSWORD_RESET_FAILED missing_new_password", {
            ...userContext,
            reason: "New password is required to reset your password",
          });

          await logAudit({
            action: "password_reset",
            email: userFinded.email,
            role,
            ip: getClientIp(req),
            details: { reason: "missing_new_password", requestId },
          });

          return res.status(400).json({
            message: "New password is required to reset your password",
            role,
          });
        }

        const newSalt = uid2(16);
        const newHash = SHA256(newPassword + newSalt).toString(encBase64);

        userFinded.salt = newSalt;
        userFinded.hash = newHash;
        userFinded.passwordLosted.status = false;
        userFinded.passwordLosted.code = null;

        await userFinded.save();

        Retour.log("PASSWORD_RESET_SUCCESS", {
          ...userContext,
        });

        await logAudit({
          action: "password_reset",
          email: userFinded.email,
          role,
          ip: getClientIp(req),
          details: { requestId },
        });

        return res.status(200).json({
          message: "Password has been successfully updated.",
          role,
        });
      }

      // 🔹 Vérification du mot de passe normal
      const hashToLog = userFinded
        ? SHA256(password + userFinded.salt).toString(encBase64)
        : null;

      if (userFinded && hashToLog && hashToLog === userFinded.hash) {
        Retour.log("LOGIN_SUCCESS", {
          ...userContext,
          // infos utiles mais non sensibles
          name: `${userFinded.account?.firstname || ""} ${userFinded.account?.name || ""}`.trim(),
          expoPushTokenUpdated: Boolean(expoPushToken),
        });

        const newToken: string = uid2(26);
        userFinded.token = newToken;

        if (expoPushToken) {
          userFinded.expoPushToken = expoPushToken;
        }

        await userFinded.save();

        await logAudit({
          action: "login_success",
          email: userFinded.email,
          role,
          ip: getClientIp(req),
          details: { requestId },
        });

        return res.status(200).json({
          message: "Logged in with email and password",
          user: userFinded,
          role,
        });
      } else {
        Retour.error("LOGIN_FAILED invalid_password", {
          ...userContext,
          reason: "Invalid password",
        });

        await logAudit({
          action: "login_failed",
          email,
          ip: getClientIp(req),
          details: { reason: "Invalid password", requestId },
        });

        return res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      Retour.error(
        "LOGIN_ERROR caught_exception",
        buildLogContext(req, { requestId, error }),
      );

      return res.status(500).json({ message: "Error caught", error });
    }
  },
);

export default router;
