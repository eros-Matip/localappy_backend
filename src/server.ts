// src/server.ts
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import cron from "node-cron";
import cloudinary from "cloudinary";
import config from "./config/config";

// SOCKET
import { initSocket } from "./utils/socket";

// ROUTES
import EventRoutes from "./routes/Event";
import OwnerRoutes from "./routes/Owner";
import EstablishmentRoutes from "./routes/Establishment";
import CustomerRoutes from "./routes/Customer";
import LoginRoute from "./routes/Login";
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

// MODELS (pour le CRON)
import Registration from "./models/Registration";
import Bill from "./models/Bill";
import Event from "./models/Event";

// MIDDLEWARES / UTILS
import AdminIsAuthenticated from "./middlewares/IsAuthenticated";
import CustomerIsAuthenticated from "./middlewares/IsAuthenticated";
import Logging from "./library/Logging";

const app = express();

// Cloudinary (v2)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
});

(async function bootstrap() {
  try {
    mongoose
      .set("strictQuery", false)
      .connect(`${config.mongooseUrl}`, { retryWrites: true, w: "majority" })
      .then(() => {
        Logging.info("mongoDB is cennected");
      })
      .catch((error) => {
        Logging.error("Unable to connect");
        Logging.error(error);
      });
    Logging.info("MongoDB connected");

    // ---------- Middlewares ----------
    const allowedOrigins = ["http://localhost:3000"]; // ajoute tes domaines prod ici
    app.use(cors({ origin: allowedOrigins }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use((req: Request, res: Response, next: NextFunction) => {
      res.on("finish", () => {
        Logging.info(
          `[${req.method}] ${req.originalUrl} - ${req.socket.remoteAddress} - ${res.statusCode}`
        );
      });
      next();
    });

    // (headers extra si besoin)
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-with, Content-Type, Accept, Authorization"
      );
      if (req.method === "OPTIONS") {
        res.header(
          "Access-Control-Allow-Methods",
          "PUT, POST, PATCH, DELETE, GET"
        );
        return res.status(200).json({});
      }
      next();
    });

    // ---------- Routes ----------
    app.use("/event", EventRoutes);
    app.use("/owner", OwnerRoutes);
    app.use("/establishment", EstablishmentRoutes);
    app.use("/customer", CustomerRoutes);
    app.use("/contact", ContactRoutes);
    app.use("/admin", AdminRoutes);
    app.use("/ads", AdsRoutes);
    app.use("/registration", RegistrationRoutes);
    app.use(LoginRoute);
    app.use(PaymentRoute);
    app.use(ResendCodeRoute);
    app.use(socialLoginRoute);
    app.use(verifPhoneRoute);
    app.use(FetchingInfoEntrepriseRoute);
    app.use(NotificationRoute);
    app.use(UpdatedPasswordLostRoute);
    app.use("/organisateur", OrganisateurRoute);
    app.use("/api", CustomerIsAuthenticated, invoiceRoutes);

    // ---------- Healthcheck ----------
    app.all("/test", AdminIsAuthenticated, async (_req, res) => {
      try {
        let regsAdded = 0;
        let billsAdded = 0;

        const registrations = await Registration.find({
          event: { $exists: true, $ne: null },
        });
        for (const reg of registrations) {
          const updated = await Event.updateOne(
            { _id: reg.event, registrations: { $ne: reg._id } },
            { $push: { registrations: reg._id } }
          );
          if (updated.modifiedCount > 0) regsAdded++;
        }

        const bills = await Bill.find({
          registration: { $exists: true, $ne: null },
        });
        for (const bill of bills) {
          const reg = await Registration.findById(bill.registration);
          if (!reg?.event) continue;
          const updated = await Event.updateOne(
            { _id: reg.event, bills: { $ne: bill._id } },
            { $push: { bills: bill._id } }
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
    });

    // ---------- 404 ----------
    app.use((req: Request, res: Response) => {
      const message = `Route not found -> [${req.method}] ${req.originalUrl}`;
      Logging.error(message);
      return res.status(404).json(message);
    });

    // ---------- CRON (nettoyage des registrations en attente) ----------
    cron.schedule("0 0 0 * * *", async () => {
      Logging.info("🔄 [CRON] Nettoyage des registrations pending...");
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      try {
        const pending = await Registration.find({
          status: "pending",
          date: { $lt: oneDayAgo },
        });
        for (const reg of pending) {
          const bill = await Bill.findOne({
            registration: reg._id,
            status: "pending",
          });
          if (bill) await bill.deleteOne();
          await reg.deleteOne();
        }
        Logging.info("✅ [CRON] Nettoyage terminé.");
      } catch (err) {
        Logging.error(`❌ [CRON] ${String(err)}`);
      }
    });

    // ---------- HTTP + Socket.IO ----------
    const server: http.Server = initSocket(app); // crée http.createServer(app) + branche Socket.IO
    const PORT = Number(config.port || 4000);

    server.listen(PORT, () =>
      Logging.info(`HTTP + Socket.IO listening on :${PORT}`)
    );

    // Arrêt propre
    const shutdown = () => {
      Logging.info("Shutting down...");
      server.close(() => {
        mongoose.connection.close(false).then(() => process.exit(0));
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Export (tests e2e)
    module.exports = { app, server };
  } catch (err) {
    Logging.error(`Bootstrap error: ${String(err)}`);
    process.exit(1);
  }
})();
