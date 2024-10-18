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
import Event from "./models/Event";
import Theme from "./models/Theme";

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
  router.use(LoginRoute);
  /** Healthcheck */
  router.all(
    "/test",
    async (req: Request, res: Response, next: NextFunction) => {
      let num = 10;
      let typeArr: string[] = [];
      let themeColors: { [key: string]: string } = {};

      // Fonction pour générer une couleur aléatoire en hexadécimal
      const generateRandomColor = (): string => {
        const letters = "0123456789ABCDEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
      };
      // Récupérer tous les thèmes des événements
      const allEvents = await Event.find().select("theme");

      // Ajouter chaque thème à `typeArr` s'il n'est pas déjà présent et ne commence pas par 'schema:'
      allEvents.forEach((event) => {
        const themes = event.theme as unknown as string[];
        if (Array.isArray(themes)) {
          themes.forEach((theme) => {
            const themeString = String(theme);
            if (
              !themeString.startsWith("schema:") &&
              !typeArr.includes(themeString)
            ) {
              typeArr.push(themeString);
            }
          });
        }
      });

      console.log("Themes without duplicates:", typeArr);

      // Récupérer les couleurs déjà utilisées pour les thèmes dans la base de données
      const existingThemes = await Theme.find().select("color");
      const usedColors = new Set(existingThemes.map((t) => t.color));

      // Parcourir chaque thème dans `typeArr` et créer un nouveau `Theme` si nécessaire
      for (const theme of typeArr) {
        // Vérifier si le thème existe déjà dans la base de données
        const existingTheme = await Theme.findOne({ theme });
        if (!existingTheme) {
          // Générer une couleur unique pour le thème
          let newColor: string;
          do {
            newColor = generateRandomColor();
          } while (usedColors.has(newColor));

          // Créer et sauvegarder le nouveau thème
          const newTheme = new Theme({
            theme,
            color: newColor,
            icon: "default_icon.png", // Vous pouvez remplacer par une valeur par défaut ou une valeur provenant de `req.body`
          });

          await newTheme.save();
          themeColors[newTheme.theme] = newTheme.color;
          usedColors.add(newColor);

          console.log("New theme created:", newTheme);
        } else {
          // Si le thème existe déjà, ajouter sa couleur à `themeColors`
          themeColors[existingTheme.theme] = existingTheme.color;
        }
      }

      console.log("Themes with colors:", themeColors);

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
