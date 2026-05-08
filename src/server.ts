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
import SendMessageOwnerRoute from "./routes/SendMessageOwner";
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
import AdminOwnersControlRoutes from "./routes/AdminOwnerControl";
import AdminStatsControlRoutes from "./routes/AdminStatsControl";
import LoyaltyControlRoutes from "./routes/LoyaltyController";
import GoodPlanControlRoutes from "./routes/GoodPlan";

// Middlewares
import AdminIsAuthenticated from "./middlewares/IsAuthenticated";
import CustomerIsAuthenticated from "./middlewares/IsAuthenticated";
import { honeypot } from "./middlewares/Honeypot";

// MODELS
import Event from "./models/Event";
import Registration from "./models/Registration";
import Bill from "./models/Bill";
import Retour from "./library/Retour";
import Customer from "./models/Customer";
import OpenAI from "openai";
import Establishment from "./models/Establishment";
import {
  createQueuedNotification,
  finalizeNotificationSend,
} from "./utils/notificationUtils";
const { Expo } = require("expo-server-sdk");
const expo = new Expo();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Stockage de photos avec Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
});

/**
 * Configure l'app (middlewares + routes + handlers).
 * Important: on ne fait PAS server.listen ici.
 * Cette fonction reprend ton contenu de startServer "tel quel" (hors listen),
 * afin que les tests puissent importer l'app déjà configurée.
 */
const configureApp = () => {
  // Check tous les Jours à 00:00 si nous avons changé de mois.
  // En test, on évite de lancer le cron (effets de bord + DB)
  if (!isTest) {
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
  }

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
  // CORS
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

  // répond aux preflight (indispensable si Authorization)
  router.options("*", cors());

  // parsers (une seule fois)
  router.use(express.json({}));
  router.use(express.urlencoded({ extended: true }));

  // =========================
  // LOGGING
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

      if (source === "unknown") {
        Logging.warn(
          `⚠️ Unknown client | ua="${ua}" | xff="${xff}" | reqId=${requestId}`,
        );
      }
    });

    next();
  });

  // =========================
  // ROUTES
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
  router.use("/ownersControl/", AdminOwnersControlRoutes);
  router.use("/statsControl/", AdminStatsControlRoutes);
  router.use("/loyalty/", LoyaltyControlRoutes);
  router.use("/good-plans/", GoodPlanControlRoutes);

  router.use(LoginRoute);
  router.use(ToolsRoutes);
  router.use(PaymentRoute);
  router.use(ResendCodeRoute);
  router.use(SendMessageOwnerRoute);
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
      } else if (req.body.test === "customers favorites -> auto descriptif") {
        try {
          const customers = await Customer.find({
            $and: [
              // ✅ a au moins 1 favori
              {
                $or: [
                  { themesFavorites: { $exists: true, $not: { $size: 0 } } },
                  { eventsFavorites: { $exists: true, $not: { $size: 0 } } },
                  { customersFavorites: { $exists: true, $not: { $size: 0 } } },
                  {
                    establishmentFavorites: {
                      $exists: true,
                      $not: { $size: 0 },
                    },
                  },
                ],
              },
              // ✅ cible uniquement les descriptifs auto "moches" existants (pour pouvoir relancer la migration)
              {
                $or: [
                  { descriptif: { $regex: "^J’aime\\s*:" } },
                  { descriptif: "" },
                  { descriptif: null },
                  { descriptif: { $exists: false } },
                ],
              },
            ],
          })
            .select(
              "_id themesFavorites eventsFavorites customersFavorites establishmentFavorites descriptif",
            )
            .populate([
              { path: "themesFavorites", model: "Theme", select: "theme" },
              { path: "eventsFavorites", model: "Event", select: "title name" },
              {
                path: "customersFavorites",
                model: "Customer",
                select: "fullName username name",
              },
              {
                path: "establishmentFavorites",
                model: "Establishment",
                select: "name title",
              },
            ]);

          const THEME_TRANSLATIONS: Record<string, string> = {
            EntertainmentAndEvent: "Divertissement et Événement",
            Market: "Marché",
            PointOfInterest: "Point d'intérêt",
            SaleEvent: "Vente",
            Conference: "Conférence",
            CulturalEvent: "Événement culturel",
            ShowEvent: "Spectacle",
            Concert: "Concert",
            LocalAnimation: "Animation locale",
            SocialEvent: "Événement social",
            TheaterEvent: "Théâtre",
            BricABrac: "Bric-à-brac",
            GarageSale: "Vide-grenier",
            Exhibition: "Exposition",
            SportsCompetition: "Compétition sportive",
            SportsEvent: "Événement sportif",
            FairOrShow: "Foire ou Salon",
            Festival: "Festival",
            Rambling: "Randonnée",
            Game: "Jeu",
            Practice: "Pratique",
            Product: "Produit",
            Traineeship: "Stage",
            OpenDay: "Journée portes ouvertes",
            ScreeningEvent: "Projection",
            ArtistSigning: "Dédicace",
            Visit: "Visite",
            Parade: "Parade",
            Rally: "Rallye",
            Commemoration: "Commémoration",
            VisualArtsEvent: "Événement arts visuels",
            ReligiousEvent: "Événement religieux",
            TraditionalCelebration: "Célébration traditionnelle",
            Carnival: "Carnaval",
            BusinessEvent: "Événement professionnel",
            Congress: "Congrès",
            Seminar: "Séminaire",
            Opera: "Opéra",
            ChildrensEvent: "Événement pour enfants",
            CircusEvent: "Cirque",
            Recital: "Récital",
            TrainingWorkshop: "Atelier de formation",
            Reading: "Lecture",
            SportsDemonstration: "Démonstration sportive",
            DanceEvent: "Événement de danse",
            PilgrimageAndProcession: "Pèlerinage et procession",
            Harvest: "Récolte",
            IntroductionCourse: "Cours d'initiation",
            PlaceOfInterest: "Lieu d'intérêt",
            SportsAndLeisurePlace: "Lieu de sport et de loisir",
            Theater: "Théâtre",
            Cinema: "Cinéma",
            Cinematheque: "Cinémathèque",
            FreePractice: "Pratique libre",
            Course: "Cours",
            Accommodation: "Hébergement",
            RentalAccommodation: "Location de logement",
            ActivityProvider: "Prestataire d'activités",
            WorkMeeting: "Réunion de travail",
            CircusPlace: "Lieu de cirque",
            AntiqueAndSecondhandGoodDealer: "Antiquaire et brocanteur",
            Store: "Magasin",
            CulturalSite: "Site culturel",
            Competition: "Compétition",
            Tasting: "Dégustation",
            Tour: "Visite guidée",
            WalkingTour: "Promenade",
            Cirque: "Cirque",
            NaturalHeritage: "Patrimoine naturel",
            Soiree: "Soirée",
          };

          const uniq = (arr: string[]) =>
            Array.from(new Set(arr.filter(Boolean)));

          const joinNatural = (arr: string[]) => {
            if (arr.length === 0) return "";
            if (arr.length === 1) return arr[0];
            if (arr.length === 2) return `${arr[0]} et ${arr[1]}`;
            return `${arr.slice(0, -1).join(", ")} et ${arr[arr.length - 1]}`;
          };

          const buildAutoDescriptif = (opts: {
            themes: string[];
            events: string[];
            establishments: string[];
          }) => {
            const themes = uniq(opts.themes).slice(0, 4);
            const events = uniq(opts.events).slice(0, 3);
            const establishments = uniq(opts.establishments).slice(0, 2);

            const parts: string[] = [];

            if (themes.length > 0) {
              parts.push(`Passionné(e) par ${joinNatural(themes)}.`);
            }

            if (events.length > 0) {
              parts.push(
                `J’aime participer à des événements comme ${joinNatural(events)}.`,
              );
            }

            if (establishments.length > 0) {
              parts.push(
                `Toujours curieux(se) de découvrir ${joinNatural(establishments)}.`,
              );
            }

            if (parts.length === 0) {
              return "Curieux(se) de découvrir de nouveaux événements et lieux.";
            }

            return parts.join(" ");
          };

          const bulkOps = customers.map((c: any) => {
            const themes =
              (c.themesFavorites || [])
                .map((t: any) => {
                  const raw = typeof t?.theme === "string" ? t.theme : "";
                  return THEME_TRANSLATIONS[raw] || raw;
                })
                .filter(Boolean) || [];

            const events =
              (c.eventsFavorites || [])
                .map((e: any) => e?.title || e?.name)
                .filter(Boolean) || [];

            const establishments =
              (c.establishmentFavorites || [])
                .map((e: any) => e?.name || e?.title)
                .filter(Boolean) || [];

            const bio = buildAutoDescriptif({
              themes,
              events,
              establishments,
            });

            return {
              updateOne: {
                filter: { _id: c._id },
                update: { $set: { descriptif: bio } }, // ✅ modifie uniquement descriptif
              },
            };
          });

          if (bulkOps.length === 0) {
            return res.status(200).json({
              message: "Migration terminée",
              modifiedCount: 0,
            });
          }

          const result = await Customer.bulkWrite(bulkOps, { ordered: false });

          return res.status(200).json({
            message: "Migration terminée",
            modifiedCount: result.modifiedCount,
          });
        } catch (error) {
          Retour.info("error catched");
          return res.status(500).json({ message: "error catched", error });
        }
      } else if (req.body.test === "update descriptif event and translate it") {
        try {
          if (!req.body.eventId) {
            Retour.warn("eventId is required");
            return res.status(404).json({ message: "eventId is required" });
          }

          const {
            eventId,
            baseLang = "fr",
            targetLangs = ["en", "es", "fr", "de", "it", "nl", "eu"],
          } = req.body as {
            eventId: string;
            baseLang?: string;
            targetLangs?: string[];
          };

          const eventFinded = await Event.findById(eventId);

          if (!eventFinded) {
            Retour.warn("event not found");
            return res.status(404).json({ message: "event not found" });
          }

          if (!eventFinded.description) {
            Retour.warn("event description is required");
            return res.status(400).json({
              message: "event description is required",
            });
          }

          if (!process.env.OPENAI_API_KEY) {
            Retour.error("OPENAI_API_KEY missing");
            return res.status(500).json({
              message: "OPENAI_API_KEY missing in env",
            });
          }

          const uniqueLangs: string[] = Array.from(
            new Set(targetLangs || []),
          ).filter(Boolean);

          if (uniqueLangs.length === 0) {
            Retour.warn("targetLangs is required");
            return res.status(400).json({
              message: "targetLangs is required",
            });
          }

          const prompt = `
Tu es un traducteur professionnel.

TEXTE SOURCE :
- Langue source : ${baseLang}
- Description : ${eventFinded.description}

TÂCHE :
Traduire cette description dans chacune des langues suivantes :
${JSON.stringify(uniqueLangs)}

CONTRAINTES :
- Respecter le sens et le ton.
- Adapter légèrement le style pour que ce soit naturel dans chaque langue cible.
- Ne PAS résumer, ne PAS rallonger inutilement.

FORMAT DE RÉPONSE :
Tu DOIS renvoyer STRICTEMENT un JSON valide, sans texte avant ou après, de la forme :

{
  "en": { "description": "..." },
  "es": { "description": "..." }
}

- Chaque clé DOIT correspondre aux codes donnés dans ${JSON.stringify(uniqueLangs)}.
- Pas d'autres clés, pas de commentaires.
    `.trim();

          const response = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: prompt,
          });

          const raw = (response as any).output_text?.trim() || "";

          let parsed: Record<string, { description?: string }> = {};

          try {
            let jsonText = raw;
            const firstBrace = raw.indexOf("{");
            const lastBrace = raw.lastIndexOf("}");

            if (
              firstBrace !== -1 &&
              lastBrace !== -1 &&
              lastBrace > firstBrace
            ) {
              jsonText = raw.slice(firstBrace, lastBrace + 1);
            }

            parsed = JSON.parse(jsonText);
          } catch (e) {
            console.error("Réponse de traduction non JSON :", raw);

            const existingTranslations = Array.isArray(eventFinded.translations)
              ? eventFinded.translations
              : [];

            const fallbackTranslations = uniqueLangs.map((code: string) => {
              const existingTranslation = existingTranslations.find(
                (translation: any) => translation.lang === code,
              );

              return {
                lang: code,
                title: existingTranslation?.title,
                shortDescription: existingTranslation?.shortDescription,
                description: eventFinded.description || "",
              };
            });

            const mergedTranslations = [
              ...existingTranslations.filter(
                (translation: any) => !uniqueLangs.includes(translation.lang),
              ),
              ...fallbackTranslations,
            ];

            eventFinded.translations = mergedTranslations;

            await eventFinded.save();

            Retour.info("event translated with fallback");
            return res.status(200).json({
              message: "event translated with fallback",
              event: eventFinded,
              warning:
                "Impossible de parser le JSON de traduction, fallback sur la description source.",
            });
          }

          const existingTranslations = Array.isArray(eventFinded.translations)
            ? eventFinded.translations
            : [];

          const newTranslations = uniqueLangs.map((code: string) => {
            const existingTranslation = existingTranslations.find(
              (translation: any) => translation.lang === code,
            );

            return {
              lang: code,
              title: existingTranslation?.title,
              shortDescription: existingTranslation?.shortDescription,
              description:
                parsed[code]?.description ?? eventFinded.description ?? "",
            };
          });

          const mergedTranslations = [
            ...existingTranslations.filter(
              (translation: any) => !uniqueLangs.includes(translation.lang),
            ),
            ...newTranslations,
          ];

          eventFinded.translations = mergedTranslations;

          await eventFinded.save();

          Retour.info("event description translated");
          return res.status(200).json({
            message: "event description translated",
            event: eventFinded,
          });
        } catch (error) {
          console.log(error);
          Retour.error("error catched");
          return res.status(500).json({ message: "error catched", error });
        }
      } else if (req.body.test === "send notif") {
        try {
          const { establishmentId } = req.body;

          const establishment = await Establishment.findById(establishmentId);
          if (!establishment) {
            return res
              .status(404)
              .json({ message: "Établissement introuvable" });
          }

          const customers = await Customer.find({
            expoPushToken: { $exists: true, $ne: null },
          });

          // ✅ FIX TypeScript ici
          const validCustomers = customers.filter(
            (c): c is typeof c & { expoPushToken: string } =>
              typeof c.expoPushToken === "string" &&
              Expo.isExpoPushToken(c.expoPushToken),
          );

          if (!validCustomers.length) {
            return res.status(200).json({
              success: true,
              message: "Aucun token valide",
              sent: 0,
            });
          }

          const title = `🎉 ${establishment.name} arrive sur Localappy !`;
          const body = `Découvrez ce nouvel établissement près de chez vous 👀`;

          const url = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://entreprise/${String(establishment._id)}`,
          )}`;

          const notificationsMap: Record<string, string> = {};
          const messages: any[] = [];

          // 🔁 boucle sur tous les users valides
          for (const customer of validCustomers) {
            const userId = String(customer._id);
            const token = customer.expoPushToken; // ✅ string garanti

            const notification = await createQueuedNotification({
              userId,
              title,
              body,
              establishmentId: String(establishment._id),
              tokens: [token],
              ttlDays: 7,
              data: { url },
            });

            notificationsMap[token] = String(notification._id);

            messages.push({
              to: token,
              sound: "default" as const,
              title,
              body,
              data: {
                url,
                notificationId: String(notification._id),
              },
            });
          }

          const chunks = expo.chunkPushNotifications(messages);

          let sentCount = 0;
          let failedCount = 0;
          const invalidTokens: string[] = [];

          let cursor = 0;

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

              for (let i = 0; i < ticketChunk.length; i++) {
                const ticket = ticketChunk[i];
                const message = messages[cursor + i];
                const token = message.to;
                const notificationId = notificationsMap[token];

                const success = ticket.status === "ok";

                if (success) {
                  sentCount++;
                } else {
                  failedCount++;

                  if (ticket.details?.error === "DeviceNotRegistered") {
                    invalidTokens.push(token);
                  }
                }

                await finalizeNotificationSend(notificationId, {
                  tickets: [ticket],
                  invalidTokens:
                    ticket.details?.error === "DeviceNotRegistered"
                      ? [token]
                      : [],
                  hadAnySuccess: success,
                  hadAnyError: !success,
                });
              }

              cursor += chunk.length;
            } catch (error) {
              console.error("Erreur chunk Expo:", error);

              for (let i = 0; i < chunk.length; i++) {
                const message = messages[cursor + i];
                const token = message.to;
                const notificationId = notificationsMap[token];

                failedCount++;

                await finalizeNotificationSend(notificationId, {
                  tickets: [],
                  invalidTokens: [],
                  hadAnySuccess: false,
                  hadAnyError: true,
                });
              }

              cursor += chunk.length;
            }
          }

          return res.status(200).json({
            success: true,
            total: customers.length,
            valid: validCustomers.length,
            sent: sentCount,
            failed: failedCount,
            invalidTokens,
            url,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            message: "error catched",
            error,
          });
        }
      } else if (req.body.test === "send notif creator activated") {
        try {
          const { userId } = req.body;

          const user = await Customer.findById(userId);
          if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
          }

          if (!user.expoPushToken) {
            return res.status(400).json({ message: "Aucun expoPushToken" });
          }

          if (!Expo.isExpoPushToken(user.expoPushToken)) {
            return res.status(400).json({ message: "Token Expo invalide" });
          }

          const userIdStr = String(user._id);

          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://profile`,
          )}`;

          const title = `✅ Compte créateur activé`;
          const body = `Bonne nouvelle ! Ton compte créateur d’événement est maintenant activé. Tu peux dès maintenant publier ton premier événement 🎉`;

          const notification = await createQueuedNotification({
            userId: userIdStr,
            title,
            body,
            tokens: [user.expoPushToken],
            ttlDays: 7,
            data: {
              url: deepLink,
            },
          });

          const message = {
            to: user.expoPushToken,
            sound: "default" as const,
            title,
            body,
            data: {
              url: deepLink,
              notificationId: String(notification._id),
            },
          };

          const tickets: any[] = [];
          const invalidTokens: string[] = [];
          let hadAnySuccess = false;
          let hadAnyError = false;

          const chunks = expo.chunkPushNotifications([message]);

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
              tickets.push(...ticketChunk);

              for (const ticket of ticketChunk) {
                if (ticket.status === "ok") {
                  hadAnySuccess = true;
                } else {
                  hadAnyError = true;

                  if (ticket.details?.error === "DeviceNotRegistered") {
                    invalidTokens.push(user.expoPushToken);
                  }
                }
              }
            } catch (error) {
              hadAnyError = true;
              console.error("Erreur Expo:", error);
            }
          }

          await finalizeNotificationSend(String(notification._id), {
            tickets,
            invalidTokens,
            hadAnySuccess,
            hadAnyError,
          });

          if (invalidTokens.length > 0) {
            await Customer.updateOne(
              { _id: user._id },
              { $set: { expoPushToken: "" } },
            );
          }

          return res.status(200).json({
            success: true,
            deepLink,
            sentTo: user.expoPushToken,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            message: "error catched",
            error,
          });
        }
      } else if (req.body.test === "send notif one") {
        try {
          const { userId, establishmentId } = req.body;

          const user = await Customer.findById(userId);
          if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
          }

          const establishment = await Establishment.findById(establishmentId);
          if (!establishment) {
            return res
              .status(404)
              .json({ message: "Établissement introuvable" });
          }

          if (!user.expoPushToken) {
            return res.status(400).json({ message: "Aucun expoPushToken" });
          }

          if (!Expo.isExpoPushToken(user.expoPushToken)) {
            return res.status(400).json({ message: "Token Expo invalide" });
          }

          const establishmentIdStr = String(establishment._id);
          const userIdStr = String(user._id);
          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://entreprise/${String(establishment._id)}`,
          )}`;

          const title = `🎉 ${establishment.name} arrive sur Localappy !`;
          const body = `Découvrez ce nouvel établissement près de chez vous 👀`;

          const notification = await createQueuedNotification({
            userId: userIdStr,
            title,
            body,
            establishmentId: establishmentIdStr,
            tokens: [user.expoPushToken],
            ttlDays: 7,
            data: {
              url: deepLink,
            },
          });

          const message = {
            to: user.expoPushToken,
            sound: "default" as const,
            title,
            body,
            data: {
              url: deepLink,
              notificationId: String(notification._id),
            },
          };

          const tickets: any[] = [];
          const invalidTokens: string[] = [];
          let hadAnySuccess = false;
          let hadAnyError = false;

          const chunks = expo.chunkPushNotifications([message]);

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
              tickets.push(...ticketChunk);

              for (const ticket of ticketChunk) {
                if (ticket.status === "ok") {
                  hadAnySuccess = true;
                } else {
                  hadAnyError = true;

                  if (ticket.details?.error === "DeviceNotRegistered") {
                    invalidTokens.push(user.expoPushToken);
                  }
                }
              }
            } catch (error) {
              hadAnyError = true;
              console.error("Erreur Expo:", error);
            }
          }

          await finalizeNotificationSend(String(notification._id), {
            tickets,
            invalidTokens,
            hadAnySuccess,
            hadAnyError,
          });

          return res.status(200).json({
            success: true,
            deepLink,
            sentTo: user.expoPushToken,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            message: "error catched",
            error,
          });
        }
      } else if (req.body.test === "send notif all users new establishment") {
        try {
          const { establishmentId } = req.body;

          if (!establishmentId) {
            return res.status(400).json({
              success: false,
              message: "establishmentId est requis",
            });
          }

          const establishment = await Establishment.findById(establishmentId);

          if (!establishment) {
            return res.status(404).json({
              success: false,
              message: "Établissement introuvable",
            });
          }

          const users = await Customer.find({
            expoPushToken: { $exists: true, $nin: [null, ""] },
            activated: true,
            banned: false,
          }).select("_id expoPushToken");

          if (!users.length) {
            return res.status(404).json({
              success: false,
              message: "Aucun utilisateur avec expoPushToken",
            });
          }

          const validUsers = users.filter(
            (user): user is typeof user & { expoPushToken: string } =>
              typeof user.expoPushToken === "string" &&
              user.expoPushToken.trim() !== "" &&
              Expo.isExpoPushToken(user.expoPushToken),
          );

          if (!validUsers.length) {
            return res.status(400).json({
              success: false,
              message: "Aucun token Expo valide",
            });
          }

          const establishmentIdStr = String(establishment._id);

          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://entreprise/${establishmentIdStr}`,
          )}`;

          const title = `🎉 ${establishment.name} arrive sur Localappy !`;

          const body = `Un nouvel établissement vient de rejoindre Localappy. Découvre sa page maintenant 👀`;

          const messages: {
            to: string;
            sound: "default";
            title: string;
            body: string;
            data: {
              url: string;
              notificationId: string;
              establishmentId: string;
              type: string;
            };
          }[] = [];

          const notificationMap = new Map<
            string,
            {
              notificationId: string;
              userId: string;
            }
          >();

          for (const user of validUsers) {
            const notification = await createQueuedNotification({
              userId: String(user._id),
              title,
              body,
              establishmentId: establishmentIdStr,
              tokens: [user.expoPushToken],
              ttlDays: 7,
              data: {
                url: deepLink,
                establishmentId: establishmentIdStr,
                type: "new_establishment",
              },
            });

            notificationMap.set(user.expoPushToken, {
              notificationId: String(notification._id),
              userId: String(user._id),
            });

            messages.push({
              to: user.expoPushToken,
              sound: "default",
              title,
              body,
              data: {
                url: deepLink,
                notificationId: String(notification._id),
                establishmentId: establishmentIdStr,
                type: "new_establishment",
              },
            });
          }

          const chunks = expo.chunkPushNotifications(messages);

          const invalidTokens: string[] = [];
          let hadAnySuccess = false;
          let hadAnyError = false;
          let successCount = 0;
          let errorCount = 0;

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

              for (let i = 0; i < ticketChunk.length; i++) {
                const ticket = ticketChunk[i];
                const message = chunk[i];
                const token = message.to;
                const notificationEntry = notificationMap.get(token);

                if (!notificationEntry) continue;

                if (ticket.status === "ok") {
                  hadAnySuccess = true;
                  successCount += 1;

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: [],
                      hadAnySuccess: true,
                      hadAnyError: false,
                    },
                  );
                } else {
                  hadAnyError = true;
                  errorCount += 1;

                  const tokenInvalid =
                    ticket.details?.error === "DeviceNotRegistered";

                  if (tokenInvalid) {
                    invalidTokens.push(token);
                  }

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: tokenInvalid ? [token] : [],
                      hadAnySuccess: false,
                      hadAnyError: true,
                    },
                  );
                }
              }
            } catch (error) {
              hadAnyError = true;
              console.error("Erreur Expo:", error);

              for (const message of chunk) {
                const notificationEntry = notificationMap.get(message.to);

                if (!notificationEntry) continue;

                errorCount += 1;

                await finalizeNotificationSend(
                  notificationEntry.notificationId,
                  {
                    tickets: [],
                    invalidTokens: [],
                    hadAnySuccess: false,
                    hadAnyError: true,
                  },
                );
              }
            }
          }

          if (invalidTokens.length > 0) {
            await Customer.updateMany(
              { expoPushToken: { $in: invalidTokens } },
              { $set: { expoPushToken: "" } },
            );
          }

          return res.status(200).json({
            success: true,
            message: "Notifications nouvel établissement envoyées",
            establishmentId: establishmentIdStr,
            establishmentName: establishment.name,
            totalUsersFound: users.length,
            validUsers: validUsers.length,
            sent: successCount,
            failed: errorCount,
            invalidTokens: invalidTokens.length,
            hadAnySuccess,
            hadAnyError,
            deepLink,
          });
        } catch (error) {
          console.error("Erreur notification nouvel établissement:", error);

          return res.status(500).json({
            success: false,
            message: "error catched",
            error,
          });
        }
      } else if (req.body.test === "send notif one event") {
        try {
          const { userId, eventId } = req.body;

          const user = await Customer.findById(userId);
          if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
          }

          const event = await Event.findById(eventId).populate<{
            establishment: any;
          }>("establishment");
          if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
          }

          const establishment = event.establishment;
          if (!establishment) {
            return res.status(404).json({
              message: "Établissement lié à l'événement introuvable",
            });
          }

          if (!user.expoPushToken) {
            return res.status(400).json({ message: "Aucun expoPushToken" });
          }

          if (!Expo.isExpoPushToken(user.expoPushToken)) {
            return res.status(400).json({ message: "Token Expo invalide" });
          }

          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://event/${String(event._id)}`,
          )}`;

          const title = `🎉 Nouvel événement ajouté !`;
          const body = `${event.title} est maintenant disponible sur Localappy 👀`;

          const notification = await createQueuedNotification({
            userId: String(user._id),
            title,
            body,
            establishmentId: String(establishment._id),
            eventId: String(event._id),
            tokens: [user.expoPushToken],
            ttlDays: 7,
            data: {
              url: deepLink,
            },
          });

          const message = {
            to: user.expoPushToken,
            sound: "default" as const,
            title,
            body,
            data: {
              url: deepLink,
              notificationId: String(notification._id),
            },
          };

          const chunks = expo.chunkPushNotifications([message]);

          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }

          return res.status(200).json({ success: true });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ message: "error catched", error });
        }
      } else if (req.body.test === "send notif all users new events") {
        try {
          const users = await Customer.find({
            expoPushToken: { $exists: true, $nin: [null, ""] },
            activated: true,
            banned: false,
          }).select("_id expoPushToken");

          if (!users.length) {
            return res.status(404).json({
              success: false,
              message: "Aucun utilisateur avec expoPushToken",
            });
          }

          const validUsers = users.filter(
            (user): user is typeof user & { expoPushToken: string } =>
              typeof user.expoPushToken === "string" &&
              user.expoPushToken.trim() !== "" &&
              Expo.isExpoPushToken(user.expoPushToken),
          );

          if (!validUsers.length) {
            return res.status(400).json({
              success: false,
              message: "Aucun token Expo valide",
            });
          }

          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://events`,
          )}`;

          const title = `📍 Nouveaux événements sur Localappy`;
          const body = `De nouvelles sorties viennent d’être ajoutées près de chez vous. Ouvrez l’app pour les découvrir !`;

          const messages: {
            to: string;
            sound: "default";
            title: string;
            body: string;
            data: {
              url: string;
              notificationId: string;
            };
          }[] = [];

          const notificationMap = new Map<
            string,
            {
              notificationId: string;
              userId: string;
            }
          >();

          for (const user of validUsers) {
            const notification = await createQueuedNotification({
              userId: String(user._id),
              title,
              body,
              tokens: [user.expoPushToken],
              ttlDays: 7,
              data: {
                url: deepLink,
              },
            });

            notificationMap.set(user.expoPushToken, {
              notificationId: String(notification._id),
              userId: String(user._id),
            });

            messages.push({
              to: user.expoPushToken,
              sound: "default",
              title,
              body,
              data: {
                url: deepLink,
                notificationId: String(notification._id),
              },
            });
          }

          const chunks = expo.chunkPushNotifications(messages);

          const invalidTokens: string[] = [];
          let hadAnySuccess = false;
          let hadAnyError = false;
          let successCount = 0;
          let errorCount = 0;

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

              for (let i = 0; i < ticketChunk.length; i++) {
                const ticket = ticketChunk[i];
                const message = chunk[i];
                const token = message.to;
                const notificationEntry = notificationMap.get(token);

                if (!notificationEntry) continue;

                if (ticket.status === "ok") {
                  hadAnySuccess = true;
                  successCount += 1;

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: [],
                      hadAnySuccess: true,
                      hadAnyError: false,
                    },
                  );
                } else {
                  hadAnyError = true;
                  errorCount += 1;

                  const tokenInvalid =
                    ticket.details?.error === "DeviceNotRegistered";

                  if (tokenInvalid) {
                    invalidTokens.push(token);
                  }

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: tokenInvalid ? [token] : [],
                      hadAnySuccess: false,
                      hadAnyError: true,
                    },
                  );
                }
              }
            } catch (error) {
              hadAnyError = true;
              console.error("Erreur Expo:", error);

              for (const message of chunk) {
                const notificationEntry = notificationMap.get(message.to);
                if (!notificationEntry) continue;

                errorCount += 1;

                await finalizeNotificationSend(
                  notificationEntry.notificationId,
                  {
                    tickets: [],
                    invalidTokens: [],
                    hadAnySuccess: false,
                    hadAnyError: true,
                  },
                );
              }
            }
          }

          if (invalidTokens.length > 0) {
            await Customer.updateMany(
              { expoPushToken: { $in: invalidTokens } },
              { $set: { expoPushToken: "" } },
            );
          }

          return res.status(200).json({
            success: true,
            message: "Notifications envoyées",
            totalUsersFound: users.length,
            validUsers: validUsers.length,
            sent: successCount,
            failed: errorCount,
            invalidTokens: invalidTokens.length,
            hadAnySuccess,
            hadAnyError,
            deepLink,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            success: false,
            message: "error catched",
            error,
          });
        }
      } else if (req.body.test === "send notif all users weekend events") {
        try {
          const users = await Customer.find({
            expoPushToken: { $exists: true, $nin: [null, ""] },
            activated: true,
            banned: false,
          }).select("_id expoPushToken");

          if (!users.length) {
            return res.status(404).json({
              success: false,
              message: "Aucun utilisateur avec expoPushToken",
            });
          }

          const validUsers = users.filter(
            (user): user is typeof user & { expoPushToken: string } =>
              typeof user.expoPushToken === "string" &&
              user.expoPushToken.trim() !== "" &&
              Expo.isExpoPushToken(user.expoPushToken),
          );

          if (!validUsers.length) {
            return res.status(400).json({
              success: false,
              message: "Aucun token Expo valide",
            });
          }

          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://events`,
          )}`;

          const title = `☀️ Des idées pour ton dimanche ?`;
          const body = `Plein d’événements près de toi à ne pas rater. Ouvre l’app et découvre les sorties autour de toi !`;

          const messages: {
            to: string;
            sound: "default";
            title: string;
            body: string;
            data: {
              url: string;
              notificationId: string;
            };
          }[] = [];

          const notificationMap = new Map<
            string,
            {
              notificationId: string;
              userId: string;
            }
          >();

          for (const user of validUsers) {
            const notification = await createQueuedNotification({
              userId: String(user._id),
              title,
              body,
              tokens: [user.expoPushToken],
              ttlDays: 7,
              data: {
                url: deepLink,
              },
            });

            notificationMap.set(user.expoPushToken, {
              notificationId: String(notification._id),
              userId: String(user._id),
            });

            messages.push({
              to: user.expoPushToken,
              sound: "default",
              title,
              body,
              data: {
                url: deepLink,
                notificationId: String(notification._id),
              },
            });
          }

          const chunks = expo.chunkPushNotifications(messages);

          const invalidTokens: string[] = [];
          let hadAnySuccess = false;
          let hadAnyError = false;
          let successCount = 0;
          let errorCount = 0;

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

              for (let i = 0; i < ticketChunk.length; i++) {
                const ticket = ticketChunk[i];
                const message = chunk[i];
                const token = message.to;
                const notificationEntry = notificationMap.get(token);

                if (!notificationEntry) continue;

                if (ticket.status === "ok") {
                  hadAnySuccess = true;
                  successCount += 1;

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: [],
                      hadAnySuccess: true,
                      hadAnyError: false,
                    },
                  );
                } else {
                  hadAnyError = true;
                  errorCount += 1;

                  const tokenInvalid =
                    ticket.details?.error === "DeviceNotRegistered";

                  if (tokenInvalid) {
                    invalidTokens.push(token);
                  }

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: tokenInvalid ? [token] : [],
                      hadAnySuccess: false,
                      hadAnyError: true,
                    },
                  );
                }
              }
            } catch (error) {
              hadAnyError = true;
              console.error("Erreur Expo:", error);

              for (const message of chunk) {
                const notificationEntry = notificationMap.get(message.to);
                if (!notificationEntry) continue;

                errorCount += 1;

                await finalizeNotificationSend(
                  notificationEntry.notificationId,
                  {
                    tickets: [],
                    invalidTokens: [],
                    hadAnySuccess: false,
                    hadAnyError: true,
                  },
                );
              }
            }
          }

          if (invalidTokens.length > 0) {
            await Customer.updateMany(
              { expoPushToken: { $in: invalidTokens } },
              { $set: { expoPushToken: "" } },
            );
          }

          return res.status(200).json({
            success: true,
            message: "Notifications week-end envoyées",
            totalUsersFound: users.length,
            validUsers: validUsers.length,
            sent: successCount,
            failed: errorCount,
            invalidTokens: invalidTokens.length,
            hadAnySuccess,
            hadAnyError,
            deepLink,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            success: false,
            message: "error catched",
            error,
          });
        }
      } else if (req.body.test === "send notif all users one event") {
        try {
          const { eventId } = req.body;

          if (!eventId) {
            return res.status(400).json({
              success: false,
              message: "eventId requis",
            });
          }

          const event = await Event.findById(eventId).populate<{
            organizer?: {
              establishment?: any;
            };
          }>("organizer.establishment");

          if (!event) {
            return res.status(404).json({
              success: false,
              message: "Événement introuvable",
            });
          }

          const establishment = event.organizer?.establishment;

          const users = await Customer.find({
            expoPushToken: { $exists: true, $nin: [null, ""] },
            activated: true,
            banned: false,
          }).select("_id expoPushToken");

          if (!users.length) {
            return res.status(404).json({
              success: false,
              message: "Aucun utilisateur avec expoPushToken",
            });
          }

          const validUsers = users.filter(
            (user): user is typeof user & { expoPushToken: string } =>
              typeof user.expoPushToken === "string" &&
              user.expoPushToken.trim() !== "" &&
              Expo.isExpoPushToken(user.expoPushToken),
          );

          if (!validUsers.length) {
            return res.status(400).json({
              success: false,
              message: "Aucun token Expo valide",
            });
          }

          const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(
            `localappy://event/${String(event._id)}`,
          )}`;

          const title = `🎉 Nouvel événement sur Localappy`;
          const body = `${event.title} est maintenant disponible${
            establishment?.name ? ` chez ${establishment.name}` : ""
          } 👀`;

          const messages: {
            to: string;
            sound: "default";
            title: string;
            body: string;
            data: {
              url: string;
              notificationId: string;
            };
          }[] = [];

          const notificationMap = new Map<
            string,
            {
              notificationId: string;
              userId: string;
            }
          >();

          for (const user of validUsers) {
            const notification = await createQueuedNotification({
              userId: String(user._id),
              title,
              body,
              establishmentId: establishment?._id
                ? String(establishment._id)
                : undefined,
              eventId: String(event._id),
              tokens: [user.expoPushToken],
              ttlDays: 7,
              data: {
                url: deepLink,
              },
            });

            notificationMap.set(user.expoPushToken, {
              notificationId: String(notification._id),
              userId: String(user._id),
            });

            messages.push({
              to: user.expoPushToken,
              sound: "default",
              title,
              body,
              data: {
                url: deepLink,
                notificationId: String(notification._id),
              },
            });
          }

          const chunks = expo.chunkPushNotifications(messages);

          const invalidTokens: string[] = [];
          let hadAnySuccess = false;
          let hadAnyError = false;
          let successCount = 0;
          let errorCount = 0;

          for (const chunk of chunks) {
            try {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

              for (let i = 0; i < ticketChunk.length; i++) {
                const ticket = ticketChunk[i];
                const message = chunk[i];
                const token = message.to;
                const notificationEntry = notificationMap.get(token);

                if (!notificationEntry) continue;

                if (ticket.status === "ok") {
                  hadAnySuccess = true;
                  successCount += 1;

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: [],
                      hadAnySuccess: true,
                      hadAnyError: false,
                    },
                  );
                } else {
                  hadAnyError = true;
                  errorCount += 1;

                  const tokenInvalid =
                    ticket.details?.error === "DeviceNotRegistered";

                  if (tokenInvalid) {
                    invalidTokens.push(token);
                  }

                  await finalizeNotificationSend(
                    notificationEntry.notificationId,
                    {
                      tickets: [ticket],
                      invalidTokens: tokenInvalid ? [token] : [],
                      hadAnySuccess: false,
                      hadAnyError: true,
                    },
                  );
                }
              }
            } catch (error) {
              hadAnyError = true;
              console.error("Erreur Expo:", error);

              for (const message of chunk) {
                const notificationEntry = notificationMap.get(message.to);
                if (!notificationEntry) continue;

                errorCount += 1;

                await finalizeNotificationSend(
                  notificationEntry.notificationId,
                  {
                    tickets: [],
                    invalidTokens: [],
                    hadAnySuccess: false,
                    hadAnyError: true,
                  },
                );
              }
            }
          }

          if (invalidTokens.length > 0) {
            await Customer.updateMany(
              { expoPushToken: { $in: invalidTokens } },
              { $set: { expoPushToken: "" } },
            );
          }

          return res.status(200).json({
            success: true,
            message:
              "Notification événement envoyée à tous les utilisateurs valides",
            eventId: String(event._id),
            eventTitle: event.title,
            totalUsersFound: users.length,
            validUsers: validUsers.length,
            sent: successCount,
            failed: errorCount,
            invalidTokens: invalidTokens.length,
            hadAnySuccess,
            hadAnyError,
            deepLink,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            success: false,
            message: "error catched",
            error,
          });
        }
      } else {
        Retour.info("test passed without function");
        return res.send("test passed without function");
      }
    },
  );

  router.use(honeypot);

  /** Error handling */
  router.use((req: Request, res: Response) => {
    const error = new Error(
      `Route has been not found -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}]`,
    );

    Logging.error(error.message);
    return res.status(404).json(error.message);
  });
};

// The server start only if mongo is already connected
const startServer = () => {
  configureApp();
  // =========================
  //  SERVER + SOCKET
  // =========================
  const server = initSocket(router);

  server.listen(config.port, () => {
    Logging.info(`Server + Socket started on port ${config.port}`);
  });
};

/**
 * PROD : on garde exactement le comportement actuel
 * mongo connect -> startServer()
 *
 * TEST : on configure l'app, mais on ne connecte pas mongo et on ne listen pas.
 */
if (!isTest) {
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
} else {
  // En test: on veut juste l'app configurée pour supertest
  configureApp();
}

export default router;
export { startServer };
