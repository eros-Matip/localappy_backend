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
import socialLoginRoute from "./routes/LoginBySocial";
import verifPhoneRoute from "./routes/VerifCode";

// FUNCTIONS
import Logging from "./library/Logging";
import AdminIsAuthenticated from "./middlewares/IsAuthenticated";
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
  router.use("/customer/", CustomerRoutes);
  router.use(LoginRoute);
  router.use(socialLoginRoute);
  router.use(verifPhoneRoute);
  /** Healthcheck */

  router.all(
    "/test",
    AdminIsAuthenticated,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Supprimer tous les thèmes existants dans la collection Theme
        await Theme.deleteMany({});
        console.log("Tous les thèmes existants ont été supprimés.");

        // Liste complète des nouveaux thèmes avec icônes et couleurs
        const themes = [
          { theme: "EntertainmentAndEvent", icon: "smile-o", color: "#FF6347" },
          { theme: "Market", icon: "shopping-cart", color: "#FFD700" },
          { theme: "PointOfInterest", icon: "map-marker", color: "#1E90FF" },
          { theme: "SaleEvent", icon: "tag", color: "#FF4500" },
          { theme: "Conference", icon: "microphone", color: "#6A5ACD" },
          { theme: "CulturalEvent", icon: "paint-brush", color: "#8A2BE2" },
          { theme: "ShowEvent", icon: "film", color: "#FF69B4" },
          { theme: "Concert", icon: "music", color: "#8B0000" },
          { theme: "LocalAnimation", icon: "magic", color: "#20B2AA" },
          { theme: "SocialEvent", icon: "group", color: "#32CD32" },
          { theme: "TheaterEvent", icon: "theater-masks", color: "#DAA520" },
          { theme: "BricABrac", icon: "handshake-o", color: "#8B4513" },
          { theme: "GarageSale", icon: "car", color: "#CD5C5C" },
          { theme: "Exhibition", icon: "image", color: "#B22222" },
          { theme: "SportsCompetition", icon: "futbol-o", color: "#228B22" },
          { theme: "SportsEvent", icon: "trophy", color: "#FFD700" },
          { theme: "FairOrShow", icon: "star", color: "#FF8C00" },
          { theme: "Festival", icon: "glass-cheers", color: "#FF7F50" },
          { theme: "Rambling", icon: "hiking", color: "#2E8B57" },
          { theme: "Game", icon: "gamepad", color: "#9400D3" },
          { theme: "Practice", icon: "chalkboard-teacher", color: "#4682B4" },
          { theme: "Product", icon: "box-open", color: "#D2691E" },
          { theme: "Traineeship", icon: "chalkboard", color: "#8B008B" },
          { theme: "OpenDay", icon: "umbrella", color: "#4169E1" },
          { theme: "ScreeningEvent", icon: "film", color: "#696969" },
          { theme: "ArtistSigning", icon: "paint-brush", color: "#2F4F4F" },
          { theme: "Visit", icon: "eye", color: "#2E8B57" },
          { theme: "Parade", icon: "flag", color: "#FF4500" },
          { theme: "Rally", icon: "road", color: "#708090" },
          { theme: "Commemoration", icon: "bell", color: "#D2B48C" },
          { theme: "VisualArtsEvent", icon: "palette", color: "#8A2BE2" },
          { theme: "ReligiousEvent", icon: "cross", color: "#8B4513" },
          { theme: "TraditionalCelebration", icon: "crown", color: "#FFD700" },
          { theme: "Carnival", icon: "user-secret", color: "#FF4500" },
          { theme: "BusinessEvent", icon: "briefcase", color: "#4682B4" },
          { theme: "Congress", icon: "users", color: "#6A5ACD" },
          { theme: "Seminar", icon: "book-open", color: "#483D8B" },
          { theme: "Opera", icon: "music", color: "#B0C4DE" },
          { theme: "ChildrensEvent", icon: "child", color: "#FFB6C1" },
          { theme: "CircusEvent", icon: "magic", color: "#FF4500" },
          { theme: "Recital", icon: "microphone", color: "#6A5ACD" },
          { theme: "TrainingWorkshop", icon: "tools", color: "#8B0000" },
          { theme: "Reading", icon: "book", color: "#4682B4" },
          { theme: "SportsDemonstration", icon: "dumbbell", color: "#2F4F4F" },
          { theme: "DanceEvent", icon: "dancer", color: "#FF69B4" },
          {
            theme: "PilgrimageAndProcession",
            icon: "walking",
            color: "#808000",
          },
          { theme: "Harvest", icon: "tractor", color: "#8B4513" },
          {
            theme: "IntroductionCourse",
            icon: "chalkboard-teacher",
            color: "#4169E1",
          },
          { theme: "PlaceOfInterest", icon: "landmark", color: "#1E90FF" },
          {
            theme: "SportsAndLeisurePlace",
            icon: "basketball-ball",
            color: "#FFA500",
          },
          { theme: "Theater", icon: "theater-masks", color: "#DAA520" },
          { theme: "Cinema", icon: "film", color: "#696969" },
          { theme: "Cinematheque", icon: "video", color: "#808780" },
          {
            theme: "FreePractice",
            icon: "chalkboard-teacher",
            color: "#2E8B57",
          },
          { theme: "Course", icon: "book-reader", color: "#8B0000" },
          { theme: "Accommodation", icon: "bed", color: "#4169E1" },
          { theme: "RentalAccommodation", icon: "home", color: "#8B4513" },
          { theme: "ActivityProvider", icon: "user-tie", color: "#4682B4" },
          { theme: "WorkMeeting", icon: "briefcase", color: "#483D8B" },
          { theme: "CircusPlace", icon: "magic", color: "#FF4500" },
          {
            theme: "AntiqueAndSecondhandGoodDealer",
            icon: "gavel",
            color: "#8B4513",
          },
          { theme: "Store", icon: "store", color: "#FFD700" },
          { theme: "CulturalSite", icon: "landmark", color: "#8A2BE2" },
          { theme: "Competition", icon: "medal", color: "#FFD700" },
          { theme: "Tasting", icon: "wine-glass", color: "#B22222" },
          { theme: "Tour", icon: "route", color: "#2E8B57" },
          { theme: "WalkingTour", icon: "walking", color: "#708090" },
          { theme: "Cirque", icon: "mask", color: "#FF4500" },
          { theme: "NaturalHeritage", icon: "tree", color: "#228B22" },
          { theme: "Soirée", icon: "cocktail", color: "#9400D3" },
        ];

        // Ajouter chaque thème dans la base de données
        for (const { theme, icon, color } of themes) {
          const newTheme = new Theme({ theme, icon, color });
          await newTheme.save();
          console.log(
            `Thème ajouté: ${theme}, Icône: ${icon}, Couleur: ${color}`
          );
        }

        res.status(200).send({ message: "Thèmes mis à jour avec succès." });
      } catch (error) {
        console.error("Erreur lors de la mise à jour des thèmes:", error);
        res
          .status(500)
          .send({ message: "Erreur lors de la mise à jour des thèmes." });
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
