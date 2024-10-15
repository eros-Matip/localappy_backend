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

// FUNCTIONS
import Logging from "./library/Logging";
import AdminIsAuthenticated from "./middlewares/IsAuthenticated";

// The server start only if mongo is already connected
const startServer = () => {
  // Check tous les Jours à 00:00 si nous avons changé de mois.
  cron.schedule("0 0 0 * * *", () => {
    console.log("hello world");
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
  router.use("/login", LoginRoute);
  /** Healthcheck */
  router.all(
    "/test",
    async (req: Request, res: Response, next: NextFunction) => {
      let num = 10;
      const start = setInterval(() => {
        console.log("num", num);
        num--;
        if (num === 0) {
          clearInterval(start);
          console.log("BOOOOOM");
        }
      }, 1000);
      Logging.info("the test is passed without mongoDB");
      return res
        .status(200)
        .send({ message: "welcome to the API without function" });
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
