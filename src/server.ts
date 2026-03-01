// MODULES
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import config from "./config/config";
import cors from "cors";
import initSocket from "./utils/socket";

const express = require("express");
const router = express();
const cloudinary = require("cloudinary");
const cron = require("node-cron");

// Library
import Logging from "./library/Logging";

// ROUTES
import EventRoutes from "./routes/Event";
import OwnerRoutes from "./routes/Owner";
import EstablishmentRoutes from "./routes/Establishment";
import CustomerRoutes from "./routes/Customer";
import LoginRoute from "./routes/Login";
import ToolsRoutes from "./routes/Tools";
import PaymentRoute from "./routes/Payment";
import socialLoginRoute from "./routes/LoginBySocial";
import verifPhoneRoute from "./routes/VerifCode";
import ResendCodeRoute from "./routes/ResendCode";
import ContactRoutes from "./routes/Contact";
import AdminRoutes from "./routes/Admin";
import FetchingInfoEntrepriseRoute from "./routes/FetchingSiret";
import NotificationRoute from "./routes/SendNotification";
import UpdatedPasswordLostRoute from "./routes/UpdatePasswordLost";
import AdsRoutes from "./routes/Ads";
import RegistrationRoutes from "./routes/Registration";
import invoiceRoutes from "./routes/invoice.routes";
import OrganisateurRoute from "./routes/Organisateur";
import AdminCompaniesControlRoutes from "./routes/AdminCompaniesControl";
import AdminUsersControlRoutes from "./routes/AdminUsersControl";

// Middlewares
import AdminIsAuthenticated from "./middlewares/IsAuthenticated";
import CustomerIsAuthenticated from "./middlewares/IsAuthenticated";

// MODELS
import Event from "./models/Event";
import Registration from "./models/Registration";
import Bill from "./models/Bill";
import Retour from "./library/Retour";

const isProd = process.env.NODE_ENV === "production";

mongoose
  .set("strictQuery", false)
  .set("autoIndex", !isProd)
  .connect(`${config.mongooseUrl}`, {
    retryWrites: true,
    w: "majority",
    autoIndex: !isProd,
  })
  .then(() => {
    Logging.info("mongoDB is connected");
    startServer();
  })
  .catch((error) => {
    Logging.error("Unable to connect");
    Logging.error(error);
  });

// Stockage de photos avec Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
});

// The server start only if mongo is already connected
const startServer = () => {
  // Check tous les Jours à 00:00 si nous avons changé de mois.
  cron.schedule("0 0 0 * * *", async () => {
    console.log("🔄 [CRON] Nettoyage des registrations pending...");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const pendingRegistrations = await Registration.find({
        status: "pending",
        date: { $lt: oneDayAgo },
      });

      for (const reg of pendingRegistrations) {
        const bill = await Bill.findOne({
          registration: reg._id,
          status: "pending",
        });

        if (bill) {
          await bill.deleteOne();
          console.log(`🧾 Bill supprimée: ${bill._id}`);
        }

        await reg.deleteOne();
        console.log(`🎟️ Registration supprimée: ${reg._id}`);
      }

      console.log("✅ [CRON] Nettoyage terminé.");
    } catch (error) {
      console.error("❌ [CRON] Erreur lors du nettoyage :", error);
    }
  });

  router.set("trust proxy", true);

  router.use((req: Request, res: Response, next: NextFunction) => {
    const ua = (req.headers["user-agent"] || "").toString().toLowerCase();
    const path = (req.path || "").toLowerCase();

    const blockedUaFragments = ["l9scan", "leakix"];
    const blockedPaths = [
      // API docs / gql
      "/swagger.json",
      "/swagger",
      "/api-docs",
      "/graphql",
      "/gql",

      // secrets & configs
      "/.env",
      "/.env.local",
      "/.env.production",
      "/config.env",
      "/config.js",
      "/config/config.yml",
      "/shared/.env",
      "/shared/config.env",
      "/shared/config/config.env",
      "/shared/config/.env",

      // backups / dumps fréquents
      "/.git",
      "/.git/config",
      "/wp-login.php",
      "/phpinfo.php",
    ];

    const isBadUa = blockedUaFragments.some((f) => ua.includes(f));
    const isBadPath = blockedPaths.some(
      (p) => path === p || path.startsWith(p + "/"),
    );

    if (isBadUa || isBadPath) {
      return res.status(404).send("Not found");
    }

    return next();
  });

  // =========================
  // ✅ CORS (PROPRE)
  // =========================
  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localappy.fr",
  ];

  router.use(
    cors({
      origin: (origin, cb) => {
        // origin undefined = Postman / server-to-server
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "token"],
      credentials: true,
    }),
  );

  // ✅ répond aux preflight (indispensable si Authorization)
  router.options("*", cors());

  // ✅ parsers (une seule fois)
  router.use(express.json({}));
  router.use(express.urlencoded({ extended: true }));

  // =========================
  // ✅ LOGGING
  // =========================
  router.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on("finish", () => {
      const ms = Date.now() - startedAt;

      const requestId = (req.headers["x-request-id"] as string) || "no-reqid";

      const xff = req.headers["x-forwarded-for"];
      const ip = req.ip;

      const ua = (req.headers["user-agent"] as string) || "";
      const isMobile = /expo|okhttp|cfnetwork|darwin|ios|android/i.test(ua);

      const origin = (req.headers["origin"] as string) || "";
      const source = origin.includes("localappy.fr")
        ? "web"
        : isMobile
          ? "mobile"
          : "unknown";

      const status = res.statusCode;
      const ok = status >= 200 && status < 400 ? "✅" : "❌";

      Logging.info(
        `${ok} ${req.method} ${req.originalUrl} ${status} - ${ms}ms | ip=${ip} | src=${source} | reqId=${requestId}`,
      );

      // (optionnel) si tu veux voir le user-agent seulement quand c'est louche
      if (source === "unknown") {
        Logging.warn(
          `⚠️ Unknown client | ua="${ua}" | xff="${xff}" | reqId=${requestId}`,
        );
      }
    });

    next();
  });

  // =========================
  // ✅ ROUTES
  // =========================
  router.use("/event/", EventRoutes);
  router.use("/owner/", OwnerRoutes);
  router.use("/establishment/", EstablishmentRoutes);
  router.use("/customer/", CustomerRoutes);
  router.use("/contact/", ContactRoutes);
  router.use("/admin/", AdminRoutes);
  router.use("/ads/", AdsRoutes);
  router.use("/registration/", RegistrationRoutes);
  router.use("/companiesControl/", AdminCompaniesControlRoutes);
  router.use("/usersControl/", AdminUsersControlRoutes);
  router.use(LoginRoute);
  router.use(ToolsRoutes);
  router.use(PaymentRoute);
  router.use(ResendCodeRoute);
  router.use(socialLoginRoute);
  router.use(verifPhoneRoute);
  router.use(FetchingInfoEntrepriseRoute);
  router.use(NotificationRoute);
  router.use(UpdatedPasswordLostRoute);
  router.use(OrganisateurRoute);

  // Factures (protégé)
  router.use("/api", CustomerIsAuthenticated, invoiceRoutes);

  /** Healthcheck */
  router.all(
    "/test",
    AdminIsAuthenticated,
    async (req: Request, res: Response) => {
      if (req.body.test === "registrations") {
        try {
          let regsAdded = 0;
          let billsAdded = 0;

          // --- Synchronisation des registrations ---
          const registrations = await Registration.find({
            event: { $exists: true, $ne: null },
          });

          for (const reg of registrations) {
            const updated = await Event.updateOne(
              { _id: reg.event, registrations: { $ne: reg._id } },
              { $push: { registrations: reg._id } },
            );
            if (updated.modifiedCount > 0) regsAdded++;
          }

          // --- Synchronisation des bills via leur registration ---
          const bills = await Bill.find({
            registration: { $exists: true, $ne: null },
          });

          for (const bill of bills) {
            const reg = await Registration.findById(bill.registration);
            if (!reg?.event) continue;

            const updated = await Event.updateOne(
              { _id: reg.event, bills: { $ne: bill._id } },
              { $push: { bills: bill._id } },
            );
            if (updated.modifiedCount > 0) billsAdded++;
          }

          res.status(200).json({
            message: "Synchronisation terminée",
            registrationsAjoutees: regsAdded,
            billsAjoutees: billsAdded,
          });
        } catch (error) {
          console.error(error);
          res
            .status(500)
            .json({ message: "Erreur lors de la synchronisation", error });
        }
      } else if (req.body.test === "history to Scannés") {
        try {
          const result = await Event.updateMany(
            { "clics.source": "deeplink" },
            {
              $set: { "clics.$[elem].source": "scannés" },
            },
            {
              arrayFilters: [{ "elem.source": "deeplink" }],
            },
          );

          return res.status(200).json({
            message: "Migration terminée",
            modifiedCount: result.modifiedCount,
          });
        } catch (error) {
          Retour.info("error catched");
          return res.status(500).json({ message: "error catched", error });
        }
      } else {
        Retour.info("test passed without function");
        return res.send("test passed without function");
      }
    },
  );

  /** Error handling */
  router.use((req: Request, res: Response) => {
    const error = new Error(
      `Route has been not found -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}]`,
    );

    Logging.error(error.message);
    return res.status(404).json(error.message);
  });

  // =========================
  // ✅ SERVER + SOCKET
  // =========================
  const server = initSocket(router);

  server.listen(config.port, () => {
    Logging.info(`Server + Socket started on port ${config.port}`);
  });
};
