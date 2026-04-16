"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("./config/config"));
const cors_1 = __importDefault(require("cors"));
const socket_1 = __importDefault(require("./utils/socket"));
const express = require("express");
const router = express();
const cloudinary = require("cloudinary");
const cron = require("node-cron");
const Logging_1 = __importDefault(require("./library/Logging"));
const Event_1 = __importDefault(require("./routes/Event"));
const Owner_1 = __importDefault(require("./routes/Owner"));
const Establishment_1 = __importDefault(require("./routes/Establishment"));
const Customer_1 = __importDefault(require("./routes/Customer"));
const Login_1 = __importDefault(require("./routes/Login"));
const Tools_1 = __importDefault(require("./routes/Tools"));
const Payment_1 = __importDefault(require("./routes/Payment"));
const LoginBySocial_1 = __importDefault(require("./routes/LoginBySocial"));
const VerifCode_1 = __importDefault(require("./routes/VerifCode"));
const ResendCode_1 = __importDefault(require("./routes/ResendCode"));
const Contact_1 = __importDefault(require("./routes/Contact"));
const Admin_1 = __importDefault(require("./routes/Admin"));
const FetchingSiret_1 = __importDefault(require("./routes/FetchingSiret"));
const SendNotification_1 = __importDefault(require("./routes/SendNotification"));
const UpdatePasswordLost_1 = __importDefault(require("./routes/UpdatePasswordLost"));
const Ads_1 = __importDefault(require("./routes/Ads"));
const Registration_1 = __importDefault(require("./routes/Registration"));
const invoice_routes_1 = __importDefault(require("./routes/invoice.routes"));
const Organisateur_1 = __importDefault(require("./routes/Organisateur"));
const AdminCompaniesControl_1 = __importDefault(require("./routes/AdminCompaniesControl"));
const AdminUsersControl_1 = __importDefault(require("./routes/AdminUsersControl"));
const AdminOwnerControl_1 = __importDefault(require("./routes/AdminOwnerControl"));
const AdminStatsControl_1 = __importDefault(require("./routes/AdminStatsControl"));
const LoyaltyController_1 = __importDefault(require("./routes/LoyaltyController"));
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const Honeypot_1 = require("./middlewares/Honeypot");
const Event_2 = __importDefault(require("./models/Event"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const Retour_1 = __importDefault(require("./library/Retour"));
const Customer_2 = __importDefault(require("./models/Customer"));
const openai_1 = __importDefault(require("openai"));
const Establishment_2 = __importDefault(require("./models/Establishment"));
const notificationUtils_1 = require("./utils/notificationUtils");
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
});
const configureApp = () => {
    if (!isTest) {
        cron.schedule("0 0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("🔄 [CRON] Nettoyage des registrations pending...");
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            try {
                const pendingRegistrations = yield Registration_2.default.find({
                    status: "pending",
                    date: { $lt: oneDayAgo },
                });
                for (const reg of pendingRegistrations) {
                    const bill = yield Bill_1.default.findOne({
                        registration: reg._id,
                        status: "pending",
                    });
                    if (bill) {
                        yield bill.deleteOne();
                        console.log(`🧾 Bill supprimée: ${bill._id}`);
                    }
                    yield reg.deleteOne();
                    console.log(`🎟️ Registration supprimée: ${reg._id}`);
                }
                console.log("✅ [CRON] Nettoyage terminé.");
            }
            catch (error) {
                console.error("❌ [CRON] Erreur lors du nettoyage :", error);
            }
        }));
    }
    router.set("trust proxy", true);
    router.use((req, res, next) => {
        const ua = (req.headers["user-agent"] || "").toString().toLowerCase();
        const path = (req.path || "").toLowerCase();
        const blockedUaFragments = ["l9scan", "leakix"];
        const blockedPaths = [
            "/swagger.json",
            "/swagger",
            "/api-docs",
            "/graphql",
            "/gql",
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
            "/.git",
            "/.git/config",
            "/wp-login.php",
            "/phpinfo.php",
        ];
        const isBadUa = blockedUaFragments.some((f) => ua.includes(f));
        const isBadPath = blockedPaths.some((p) => path === p || path.startsWith(p + "/"));
        if (isBadUa || isBadPath) {
            return res.status(404).send("Not found");
        }
        return next();
    });
    const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localappy.fr",
    ];
    router.use((0, cors_1.default)({
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (allowedOrigins.includes(origin))
                return cb(null, true);
            return cb(new Error(`CORS blocked for origin: ${origin}`));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "token"],
        credentials: true,
    }));
    router.options("*", (0, cors_1.default)());
    router.use(express.json({}));
    router.use(express.urlencoded({ extended: true }));
    router.use((req, res, next) => {
        const startedAt = Date.now();
        res.on("finish", () => {
            const ms = Date.now() - startedAt;
            const requestId = req.headers["x-request-id"] || "no-reqid";
            const xff = req.headers["x-forwarded-for"];
            const ip = req.ip;
            const ua = req.headers["user-agent"] || "";
            const isMobile = /expo|okhttp|cfnetwork|darwin|ios|android/i.test(ua);
            const origin = req.headers["origin"] || "";
            const source = origin.includes("localappy.fr")
                ? "web"
                : isMobile
                    ? "mobile"
                    : "unknown";
            const status = res.statusCode;
            const ok = status >= 200 && status < 400 ? "✅" : "❌";
            Logging_1.default.info(`${ok} ${req.method} ${req.originalUrl} ${status} - ${ms}ms | ip=${ip} | src=${source} | reqId=${requestId}`);
            if (source === "unknown") {
                Logging_1.default.warn(`⚠️ Unknown client | ua="${ua}" | xff="${xff}" | reqId=${requestId}`);
            }
        });
        next();
    });
    router.use("/event/", Event_1.default);
    router.use("/owner/", Owner_1.default);
    router.use("/establishment/", Establishment_1.default);
    router.use("/customer/", Customer_1.default);
    router.use("/contact/", Contact_1.default);
    router.use("/admin/", Admin_1.default);
    router.use("/ads/", Ads_1.default);
    router.use("/registration/", Registration_1.default);
    router.use("/companiesControl/", AdminCompaniesControl_1.default);
    router.use("/usersControl/", AdminUsersControl_1.default);
    router.use("/ownersControl/", AdminOwnerControl_1.default);
    router.use("/statsControl/", AdminStatsControl_1.default);
    router.use("/loyalty/", LoyaltyController_1.default);
    router.use(Login_1.default);
    router.use(Tools_1.default);
    router.use(Payment_1.default);
    router.use(ResendCode_1.default);
    router.use(LoginBySocial_1.default);
    router.use(VerifCode_1.default);
    router.use(FetchingSiret_1.default);
    router.use(SendNotification_1.default);
    router.use(UpdatePasswordLost_1.default);
    router.use(Organisateur_1.default);
    router.use("/api", IsAuthenticated_1.default, invoice_routes_1.default);
    router.all("/test", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        if (req.body.test === "registrations") {
            try {
                let regsAdded = 0;
                let billsAdded = 0;
                const registrations = yield Registration_2.default.find({
                    event: { $exists: true, $ne: null },
                });
                for (const reg of registrations) {
                    const updated = yield Event_2.default.updateOne({ _id: reg.event, registrations: { $ne: reg._id } }, { $push: { registrations: reg._id } });
                    if (updated.modifiedCount > 0)
                        regsAdded++;
                }
                const bills = yield Bill_1.default.find({
                    registration: { $exists: true, $ne: null },
                });
                for (const bill of bills) {
                    const reg = yield Registration_2.default.findById(bill.registration);
                    if (!(reg === null || reg === void 0 ? void 0 : reg.event))
                        continue;
                    const updated = yield Event_2.default.updateOne({ _id: reg.event, bills: { $ne: bill._id } }, { $push: { bills: bill._id } });
                    if (updated.modifiedCount > 0)
                        billsAdded++;
                }
                res.status(200).json({
                    message: "Synchronisation terminée",
                    registrationsAjoutees: regsAdded,
                    billsAjoutees: billsAdded,
                });
            }
            catch (error) {
                console.error(error);
                res
                    .status(500)
                    .json({ message: "Erreur lors de la synchronisation", error });
            }
        }
        else if (req.body.test === "history to Scannés") {
            try {
                const result = yield Event_2.default.updateMany({ "clics.source": "deeplink" }, {
                    $set: { "clics.$[elem].source": "scannés" },
                }, {
                    arrayFilters: [{ "elem.source": "deeplink" }],
                });
                return res.status(200).json({
                    message: "Migration terminée",
                    modifiedCount: result.modifiedCount,
                });
            }
            catch (error) {
                Retour_1.default.info("error catched");
                return res.status(500).json({ message: "error catched", error });
            }
        }
        else if (req.body.test === "customers favorites -> auto descriptif") {
            try {
                const customers = yield Customer_2.default.find({
                    $and: [
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
                    .select("_id themesFavorites eventsFavorites customersFavorites establishmentFavorites descriptif")
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
                const THEME_TRANSLATIONS = {
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
                const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
                const joinNatural = (arr) => {
                    if (arr.length === 0)
                        return "";
                    if (arr.length === 1)
                        return arr[0];
                    if (arr.length === 2)
                        return `${arr[0]} et ${arr[1]}`;
                    return `${arr.slice(0, -1).join(", ")} et ${arr[arr.length - 1]}`;
                };
                const buildAutoDescriptif = (opts) => {
                    const themes = uniq(opts.themes).slice(0, 4);
                    const events = uniq(opts.events).slice(0, 3);
                    const establishments = uniq(opts.establishments).slice(0, 2);
                    const parts = [];
                    if (themes.length > 0) {
                        parts.push(`Passionné(e) par ${joinNatural(themes)}.`);
                    }
                    if (events.length > 0) {
                        parts.push(`J’aime participer à des événements comme ${joinNatural(events)}.`);
                    }
                    if (establishments.length > 0) {
                        parts.push(`Toujours curieux(se) de découvrir ${joinNatural(establishments)}.`);
                    }
                    if (parts.length === 0) {
                        return "Curieux(se) de découvrir de nouveaux événements et lieux.";
                    }
                    return parts.join(" ");
                };
                const bulkOps = customers.map((c) => {
                    const themes = (c.themesFavorites || [])
                        .map((t) => {
                        const raw = typeof (t === null || t === void 0 ? void 0 : t.theme) === "string" ? t.theme : "";
                        return THEME_TRANSLATIONS[raw] || raw;
                    })
                        .filter(Boolean) || [];
                    const events = (c.eventsFavorites || [])
                        .map((e) => (e === null || e === void 0 ? void 0 : e.title) || (e === null || e === void 0 ? void 0 : e.name))
                        .filter(Boolean) || [];
                    const establishments = (c.establishmentFavorites || [])
                        .map((e) => (e === null || e === void 0 ? void 0 : e.name) || (e === null || e === void 0 ? void 0 : e.title))
                        .filter(Boolean) || [];
                    const bio = buildAutoDescriptif({
                        themes,
                        events,
                        establishments,
                    });
                    return {
                        updateOne: {
                            filter: { _id: c._id },
                            update: { $set: { descriptif: bio } },
                        },
                    };
                });
                if (bulkOps.length === 0) {
                    return res.status(200).json({
                        message: "Migration terminée",
                        modifiedCount: 0,
                    });
                }
                const result = yield Customer_2.default.bulkWrite(bulkOps, { ordered: false });
                return res.status(200).json({
                    message: "Migration terminée",
                    modifiedCount: result.modifiedCount,
                });
            }
            catch (error) {
                Retour_1.default.info("error catched");
                return res.status(500).json({ message: "error catched", error });
            }
        }
        else if (req.body.test === "update descriptif event and translate it") {
            try {
                if (!req.body.eventId) {
                    Retour_1.default.warn("eventId is required");
                    return res.status(404).json({ message: "eventId is required" });
                }
                const { eventId, baseLang = "fr", targetLangs = ["en", "es", "fr", "de", "it", "nl", "eu"], } = req.body;
                const eventFinded = yield Event_2.default.findById(eventId);
                if (!eventFinded) {
                    Retour_1.default.warn("event not found");
                    return res.status(404).json({ message: "event not found" });
                }
                if (!eventFinded.description) {
                    Retour_1.default.warn("event description is required");
                    return res.status(400).json({
                        message: "event description is required",
                    });
                }
                if (!process.env.OPENAI_API_KEY) {
                    Retour_1.default.error("OPENAI_API_KEY missing");
                    return res.status(500).json({
                        message: "OPENAI_API_KEY missing in env",
                    });
                }
                const uniqueLangs = Array.from(new Set(targetLangs || [])).filter(Boolean);
                if (uniqueLangs.length === 0) {
                    Retour_1.default.warn("targetLangs is required");
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
                const response = yield openai.responses.create({
                    model: "gpt-4.1-mini",
                    input: prompt,
                });
                const raw = ((_a = response.output_text) === null || _a === void 0 ? void 0 : _a.trim()) || "";
                let parsed = {};
                try {
                    let jsonText = raw;
                    const firstBrace = raw.indexOf("{");
                    const lastBrace = raw.lastIndexOf("}");
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        jsonText = raw.slice(firstBrace, lastBrace + 1);
                    }
                    parsed = JSON.parse(jsonText);
                }
                catch (e) {
                    console.error("Réponse de traduction non JSON :", raw);
                    const existingTranslations = Array.isArray(eventFinded.translations)
                        ? eventFinded.translations
                        : [];
                    const fallbackTranslations = uniqueLangs.map((code) => {
                        const existingTranslation = existingTranslations.find((translation) => translation.lang === code);
                        return {
                            lang: code,
                            title: existingTranslation === null || existingTranslation === void 0 ? void 0 : existingTranslation.title,
                            shortDescription: existingTranslation === null || existingTranslation === void 0 ? void 0 : existingTranslation.shortDescription,
                            description: eventFinded.description || "",
                        };
                    });
                    const mergedTranslations = [
                        ...existingTranslations.filter((translation) => !uniqueLangs.includes(translation.lang)),
                        ...fallbackTranslations,
                    ];
                    eventFinded.translations = mergedTranslations;
                    yield eventFinded.save();
                    Retour_1.default.info("event translated with fallback");
                    return res.status(200).json({
                        message: "event translated with fallback",
                        event: eventFinded,
                        warning: "Impossible de parser le JSON de traduction, fallback sur la description source.",
                    });
                }
                const existingTranslations = Array.isArray(eventFinded.translations)
                    ? eventFinded.translations
                    : [];
                const newTranslations = uniqueLangs.map((code) => {
                    var _a, _b, _c;
                    const existingTranslation = existingTranslations.find((translation) => translation.lang === code);
                    return {
                        lang: code,
                        title: existingTranslation === null || existingTranslation === void 0 ? void 0 : existingTranslation.title,
                        shortDescription: existingTranslation === null || existingTranslation === void 0 ? void 0 : existingTranslation.shortDescription,
                        description: (_c = (_b = (_a = parsed[code]) === null || _a === void 0 ? void 0 : _a.description) !== null && _b !== void 0 ? _b : eventFinded.description) !== null && _c !== void 0 ? _c : "",
                    };
                });
                const mergedTranslations = [
                    ...existingTranslations.filter((translation) => !uniqueLangs.includes(translation.lang)),
                    ...newTranslations,
                ];
                eventFinded.translations = mergedTranslations;
                yield eventFinded.save();
                Retour_1.default.info("event description translated");
                return res.status(200).json({
                    message: "event description translated",
                    event: eventFinded,
                });
            }
            catch (error) {
                console.log(error);
                Retour_1.default.error("error catched");
                return res.status(500).json({ message: "error catched", error });
            }
        }
        else if (req.body.test === "send notif") {
            try {
                const { establishmentId } = req.body;
                const establishment = yield Establishment_2.default.findById(establishmentId);
                if (!establishment) {
                    return res.status(404).json({ message: "Établissement introuvable" });
                }
                const customers = yield Customer_2.default.find({
                    expoPushToken: { $exists: true, $ne: null },
                });
                const validCustomers = customers.filter((c) => typeof c.expoPushToken === "string" &&
                    Expo.isExpoPushToken(c.expoPushToken));
                if (!validCustomers.length) {
                    return res.status(200).json({
                        success: true,
                        message: "Aucun token valide",
                        sent: 0,
                    });
                }
                const title = `🎉 ${establishment.name} arrive sur Localappy !`;
                const body = `Découvrez ce nouvel établissement près de chez vous 👀`;
                const url = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://entreprise/${String(establishment._id)}`)}`;
                const notificationsMap = {};
                const messages = [];
                for (const customer of validCustomers) {
                    const userId = String(customer._id);
                    const token = customer.expoPushToken;
                    const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
                        sound: "default",
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
                const invalidTokens = [];
                let cursor = 0;
                for (const chunk of chunks) {
                    try {
                        const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                        for (let i = 0; i < ticketChunk.length; i++) {
                            const ticket = ticketChunk[i];
                            const message = messages[cursor + i];
                            const token = message.to;
                            const notificationId = notificationsMap[token];
                            const success = ticket.status === "ok";
                            if (success) {
                                sentCount++;
                            }
                            else {
                                failedCount++;
                                if (((_b = ticket.details) === null || _b === void 0 ? void 0 : _b.error) === "DeviceNotRegistered") {
                                    invalidTokens.push(token);
                                }
                            }
                            yield (0, notificationUtils_1.finalizeNotificationSend)(notificationId, {
                                tickets: [ticket],
                                invalidTokens: ((_c = ticket.details) === null || _c === void 0 ? void 0 : _c.error) === "DeviceNotRegistered"
                                    ? [token]
                                    : [],
                                hadAnySuccess: success,
                                hadAnyError: !success,
                            });
                        }
                        cursor += chunk.length;
                    }
                    catch (error) {
                        console.error("Erreur chunk Expo:", error);
                        for (let i = 0; i < chunk.length; i++) {
                            const message = messages[cursor + i];
                            const token = message.to;
                            const notificationId = notificationsMap[token];
                            failedCount++;
                            yield (0, notificationUtils_1.finalizeNotificationSend)(notificationId, {
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
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    message: "error catched",
                    error,
                });
            }
        }
        else if (req.body.test === "send notif creator activated") {
            try {
                const { userId } = req.body;
                const user = yield Customer_2.default.findById(userId);
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
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://profile`)}`;
                const title = `✅ Compte créateur activé`;
                const body = `Bonne nouvelle ! Ton compte créateur d’événement est maintenant activé. Tu peux dès maintenant publier ton premier événement 🎉`;
                const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
                    sound: "default",
                    title,
                    body,
                    data: {
                        url: deepLink,
                        notificationId: String(notification._id),
                    },
                };
                const tickets = [];
                const invalidTokens = [];
                let hadAnySuccess = false;
                let hadAnyError = false;
                const chunks = expo.chunkPushNotifications([message]);
                for (const chunk of chunks) {
                    try {
                        const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                        tickets.push(...ticketChunk);
                        for (const ticket of ticketChunk) {
                            if (ticket.status === "ok") {
                                hadAnySuccess = true;
                            }
                            else {
                                hadAnyError = true;
                                if (((_d = ticket.details) === null || _d === void 0 ? void 0 : _d.error) === "DeviceNotRegistered") {
                                    invalidTokens.push(user.expoPushToken);
                                }
                            }
                        }
                    }
                    catch (error) {
                        hadAnyError = true;
                        console.error("Erreur Expo:", error);
                    }
                }
                yield (0, notificationUtils_1.finalizeNotificationSend)(String(notification._id), {
                    tickets,
                    invalidTokens,
                    hadAnySuccess,
                    hadAnyError,
                });
                if (invalidTokens.length > 0) {
                    yield Customer_2.default.updateOne({ _id: user._id }, { $set: { expoPushToken: "" } });
                }
                return res.status(200).json({
                    success: true,
                    deepLink,
                    sentTo: user.expoPushToken,
                });
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    message: "error catched",
                    error,
                });
            }
        }
        else if (req.body.test === "send notif one") {
            try {
                const { userId, establishmentId } = req.body;
                const user = yield Customer_2.default.findById(userId);
                if (!user) {
                    return res.status(404).json({ message: "Utilisateur introuvable" });
                }
                const establishment = yield Establishment_2.default.findById(establishmentId);
                if (!establishment) {
                    return res.status(404).json({ message: "Établissement introuvable" });
                }
                if (!user.expoPushToken) {
                    return res.status(400).json({ message: "Aucun expoPushToken" });
                }
                if (!Expo.isExpoPushToken(user.expoPushToken)) {
                    return res.status(400).json({ message: "Token Expo invalide" });
                }
                const establishmentIdStr = String(establishment._id);
                const userIdStr = String(user._id);
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://entreprise/${String(establishment._id)}`)}`;
                const title = `🎉 ${establishment.name} arrive sur Localappy !`;
                const body = `Découvrez ce nouvel établissement près de chez vous 👀`;
                const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
                    sound: "default",
                    title,
                    body,
                    data: {
                        url: deepLink,
                        notificationId: String(notification._id),
                    },
                };
                const tickets = [];
                const invalidTokens = [];
                let hadAnySuccess = false;
                let hadAnyError = false;
                const chunks = expo.chunkPushNotifications([message]);
                for (const chunk of chunks) {
                    try {
                        const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                        tickets.push(...ticketChunk);
                        for (const ticket of ticketChunk) {
                            if (ticket.status === "ok") {
                                hadAnySuccess = true;
                            }
                            else {
                                hadAnyError = true;
                                if (((_e = ticket.details) === null || _e === void 0 ? void 0 : _e.error) === "DeviceNotRegistered") {
                                    invalidTokens.push(user.expoPushToken);
                                }
                            }
                        }
                    }
                    catch (error) {
                        hadAnyError = true;
                        console.error("Erreur Expo:", error);
                    }
                }
                yield (0, notificationUtils_1.finalizeNotificationSend)(String(notification._id), {
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
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    message: "error catched",
                    error,
                });
            }
        }
        else if (req.body.test === "send notif one event") {
            try {
                const { userId, eventId } = req.body;
                const user = yield Customer_2.default.findById(userId);
                if (!user) {
                    return res.status(404).json({ message: "Utilisateur introuvable" });
                }
                const event = yield Event_2.default.findById(eventId).populate("establishment");
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
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://event/${String(event._id)}`)}`;
                const title = `🎉 Nouvel événement ajouté !`;
                const body = `${event.title} est maintenant disponible sur Localappy 👀`;
                const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
                    sound: "default",
                    title,
                    body,
                    data: {
                        url: deepLink,
                        notificationId: String(notification._id),
                    },
                };
                const chunks = expo.chunkPushNotifications([message]);
                for (const chunk of chunks) {
                    yield expo.sendPushNotificationsAsync(chunk);
                }
                return res.status(200).json({ success: true });
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({ message: "error catched", error });
            }
        }
        else if (req.body.test === "send notif all users new events") {
            try {
                const users = yield Customer_2.default.find({
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
                const validUsers = users.filter((user) => typeof user.expoPushToken === "string" &&
                    user.expoPushToken.trim() !== "" &&
                    Expo.isExpoPushToken(user.expoPushToken));
                if (!validUsers.length) {
                    return res.status(400).json({
                        success: false,
                        message: "Aucun token Expo valide",
                    });
                }
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://events`)}`;
                const title = `📍 Nouveaux événements sur Localappy`;
                const body = `De nouvelles sorties viennent d’être ajoutées près de chez vous. Ouvrez l’app pour les découvrir !`;
                const messages = [];
                const notificationMap = new Map();
                for (const user of validUsers) {
                    const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
                const invalidTokens = [];
                let hadAnySuccess = false;
                let hadAnyError = false;
                let successCount = 0;
                let errorCount = 0;
                for (const chunk of chunks) {
                    try {
                        const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                        for (let i = 0; i < ticketChunk.length; i++) {
                            const ticket = ticketChunk[i];
                            const message = chunk[i];
                            const token = message.to;
                            const notificationEntry = notificationMap.get(token);
                            if (!notificationEntry)
                                continue;
                            if (ticket.status === "ok") {
                                hadAnySuccess = true;
                                successCount += 1;
                                yield (0, notificationUtils_1.finalizeNotificationSend)(notificationEntry.notificationId, {
                                    tickets: [ticket],
                                    invalidTokens: [],
                                    hadAnySuccess: true,
                                    hadAnyError: false,
                                });
                            }
                            else {
                                hadAnyError = true;
                                errorCount += 1;
                                const tokenInvalid = ((_f = ticket.details) === null || _f === void 0 ? void 0 : _f.error) === "DeviceNotRegistered";
                                if (tokenInvalid) {
                                    invalidTokens.push(token);
                                }
                                yield (0, notificationUtils_1.finalizeNotificationSend)(notificationEntry.notificationId, {
                                    tickets: [ticket],
                                    invalidTokens: tokenInvalid ? [token] : [],
                                    hadAnySuccess: false,
                                    hadAnyError: true,
                                });
                            }
                        }
                    }
                    catch (error) {
                        hadAnyError = true;
                        console.error("Erreur Expo:", error);
                        for (const message of chunk) {
                            const notificationEntry = notificationMap.get(message.to);
                            if (!notificationEntry)
                                continue;
                            errorCount += 1;
                            yield (0, notificationUtils_1.finalizeNotificationSend)(notificationEntry.notificationId, {
                                tickets: [],
                                invalidTokens: [],
                                hadAnySuccess: false,
                                hadAnyError: true,
                            });
                        }
                    }
                }
                if (invalidTokens.length > 0) {
                    yield Customer_2.default.updateMany({ expoPushToken: { $in: invalidTokens } }, { $set: { expoPushToken: "" } });
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
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    success: false,
                    message: "error catched",
                    error,
                });
            }
        }
        else if (req.body.test === "send notif all users weekend events") {
            try {
                const users = yield Customer_2.default.find({
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
                const validUsers = users.filter((user) => typeof user.expoPushToken === "string" &&
                    user.expoPushToken.trim() !== "" &&
                    Expo.isExpoPushToken(user.expoPushToken));
                if (!validUsers.length) {
                    return res.status(400).json({
                        success: false,
                        message: "Aucun token Expo valide",
                    });
                }
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://events`)}`;
                const title = `🔥 Tu fais quoi ce week-end ?`;
                const body = `Plein d’événements près de toi à ne pas rater. Ouvre l’app et découvre les sorties autour de toi !`;
                const messages = [];
                const notificationMap = new Map();
                for (const user of validUsers) {
                    const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
                const invalidTokens = [];
                let hadAnySuccess = false;
                let hadAnyError = false;
                let successCount = 0;
                let errorCount = 0;
                for (const chunk of chunks) {
                    try {
                        const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                        for (let i = 0; i < ticketChunk.length; i++) {
                            const ticket = ticketChunk[i];
                            const message = chunk[i];
                            const token = message.to;
                            const notificationEntry = notificationMap.get(token);
                            if (!notificationEntry)
                                continue;
                            if (ticket.status === "ok") {
                                hadAnySuccess = true;
                                successCount += 1;
                                yield (0, notificationUtils_1.finalizeNotificationSend)(notificationEntry.notificationId, {
                                    tickets: [ticket],
                                    invalidTokens: [],
                                    hadAnySuccess: true,
                                    hadAnyError: false,
                                });
                            }
                            else {
                                hadAnyError = true;
                                errorCount += 1;
                                const tokenInvalid = ((_g = ticket.details) === null || _g === void 0 ? void 0 : _g.error) === "DeviceNotRegistered";
                                if (tokenInvalid) {
                                    invalidTokens.push(token);
                                }
                                yield (0, notificationUtils_1.finalizeNotificationSend)(notificationEntry.notificationId, {
                                    tickets: [ticket],
                                    invalidTokens: tokenInvalid ? [token] : [],
                                    hadAnySuccess: false,
                                    hadAnyError: true,
                                });
                            }
                        }
                    }
                    catch (error) {
                        hadAnyError = true;
                        console.error("Erreur Expo:", error);
                        for (const message of chunk) {
                            const notificationEntry = notificationMap.get(message.to);
                            if (!notificationEntry)
                                continue;
                            errorCount += 1;
                            yield (0, notificationUtils_1.finalizeNotificationSend)(notificationEntry.notificationId, {
                                tickets: [],
                                invalidTokens: [],
                                hadAnySuccess: false,
                                hadAnyError: true,
                            });
                        }
                    }
                }
                if (invalidTokens.length > 0) {
                    yield Customer_2.default.updateMany({ expoPushToken: { $in: invalidTokens } }, { $set: { expoPushToken: "" } });
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
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    success: false,
                    message: "error catched",
                    error,
                });
            }
        }
        else {
            Retour_1.default.info("test passed without function");
            return res.send("test passed without function");
        }
    }));
    router.use(Honeypot_1.honeypot);
    router.use((req, res) => {
        const error = new Error(`Route has been not found -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}]`);
        Logging_1.default.error(error.message);
        return res.status(404).json(error.message);
    });
};
const startServer = () => {
    configureApp();
    const server = (0, socket_1.default)(router);
    server.listen(config_1.default.port, () => {
        Logging_1.default.info(`Server + Socket started on port ${config_1.default.port}`);
    });
};
exports.startServer = startServer;
if (!isTest) {
    mongoose_1.default
        .set("strictQuery", false)
        .set("autoIndex", !isProd)
        .connect(`${config_1.default.mongooseUrl}`, {
        retryWrites: true,
        w: "majority",
        autoIndex: !isProd,
    })
        .then(() => {
        Logging_1.default.info("mongoDB is connected");
        startServer();
    })
        .catch((error) => {
        Logging_1.default.error("Unable to connect");
        Logging_1.default.error(error);
    });
}
else {
    configureApp();
}
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsNkRBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qiw0REFBd0M7QUFFeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbEMsZ0VBQXdDO0FBR3hDLDJEQUF5QztBQUN6QywyREFBeUM7QUFDekMsMkVBQXlEO0FBQ3pELGlFQUErQztBQUMvQywyREFBd0M7QUFDeEMsMkRBQXlDO0FBQ3pDLCtEQUE0QztBQUM1QywyRUFBc0Q7QUFDdEQsbUVBQWlEO0FBQ2pELHFFQUFrRDtBQUNsRCwrREFBNkM7QUFDN0MsMkRBQXlDO0FBQ3pDLDJFQUFpRTtBQUNqRSxpRkFBMEQ7QUFDMUQscUZBQW1FO0FBQ25FLHVEQUFxQztBQUNyQyx5RUFBdUQ7QUFDdkQsNkVBQW9EO0FBQ3BELHlFQUFzRDtBQUN0RCwyRkFBeUU7QUFDekUsbUZBQWlFO0FBQ2pFLG1GQUFrRTtBQUNsRSxtRkFBaUU7QUFDakUsbUZBQThEO0FBSTlELG9GQUFvRTtBQUNwRSxxREFBa0Q7QUFHbEQsMkRBQW1DO0FBQ25DLHlFQUFpRDtBQUNqRCx5REFBaUM7QUFDakMsOERBQXNDO0FBQ3RDLGlFQUF5QztBQUN6QyxvREFBNEI7QUFDNUIsMkVBQW1EO0FBQ25ELGlFQUdtQztBQUNuQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztBQUV4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