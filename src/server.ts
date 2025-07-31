// MODULES
import { Request, Response, NextFunction } from "express";
import http from "http";
import mongoose from "mongoose";
import config from "./config/config";
import cors from "cors";

const express = require("express");
const router = express();
const cloudinary = require("cloudinary");
const cron = require("node-cron");
const CryptoJS = require("crypto-js");

mongoose
  .set("strictQuery", false)
  .connect(`${config.mongooseUrl}`, { retryWrites: true, w: "majority" })
  .then(() => {
    Logging.info("mongoDB is cennected");
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

// Library

// MODELS

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
// FUNCTIONS
import Logging from "./library/Logging";
import AdminIsAuthenticated from "./middlewares/IsAuthenticated";
import Event from "./models/Event";
import OrganisateurRoute from "./routes/Organisateur";

// The server start only if mongo is already connected
const startServer = () => {
  // Check tous les Jours à 00:00 si nous avons changé de mois.
  cron.schedule("0 0 0 * * *", () => {
    console.log("hello world");
    // Mettre en place la suppression d'un compte Owner S'il n'est pas vérifié afin de supprimé ce qui sont passé tout de meme
  });

  const allowedOrigins = ["http://localhost:3000"];

  const options: cors.CorsOptions = {
    origin: allowedOrigins,
  };

  router.use(cors(options));
  router.use(express.json({}));

  router.use((req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      Logging.info(
        `Server Started -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}] - Status: [${res.statusCode}]`
      );
    });
    next();
  });

  router.use(express.urlencoded({ extended: true }));

  // The rules of the API
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-with, Content-Type, Accept,Authorization"
    );
    if (req.method == "OPTIONS") {
      res.header(
        "Access-Control-Allow-Methods",
        "PUT, POST, PATCH, DELETE, GET"
      );
      return res.status(200).json({});
    }
    next();
  });

  router.use("/event/", EventRoutes);
  router.use("/owner/", OwnerRoutes);
  router.use("/establishment/", EstablishmentRoutes);
  router.use("/customer/", CustomerRoutes);
  router.use("/customer/", CustomerRoutes);
  router.use("/contact/", ContactRoutes);
  router.use("/admin/", AdminRoutes);
  router.use("/ads/", AdsRoutes);
  router.use(LoginRoute);
  router.use(PaymentRoute);
  router.use(ResendCodeRoute);
  router.use(socialLoginRoute);
  router.use(verifPhoneRoute);
  router.use(FetchingInfoEntrepriseRoute);
  router.use(NotificationRoute);
  router.use(UpdatedPasswordLostRoute);
  router.use(OrganisateurRoute);
  /** Healthcheck */

  router.all(
    "/test",
    AdminIsAuthenticated,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await Event.updateMany(
          { isDraft: true }, // condition : uniquement ceux qui sont en brouillon
          { $set: { isDraft: false } } // mise à jour : les passer à false
        );

        res.status(200).send({
          message: `${result.modifiedCount} événements ont été mis à jour.`,
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour des événements:", error);
        res
          .status(500)
          .send({ message: "Erreur lors de la mise à jour des événements." });
      }
    }
  );

  /**Error handling */
  router.use((req: Request, res: Response) => {
    const error = new Error(
      `Route has been not found -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}]`
    );

    Logging.error(error.message);
    return res.status(404).json(error.message);
  });

  http
    .createServer(router)
    .listen(config.port, () =>
      Logging.info(`Server is started on new port ${config.port}`)
    );
};
