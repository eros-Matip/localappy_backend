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
const SendMessageOwner_1 = __importDefault(require("./routes/SendMessageOwner"));
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
const GoodPlan_1 = __importDefault(require("./routes/GoodPlan"));
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
    router.use("/good-plans/", GoodPlan_1.default);
    router.use(Login_1.default);
    router.use(Tools_1.default);
    router.use(Payment_1.default);
    router.use(ResendCode_1.default);
    router.use(SendMessageOwner_1.default);
    router.use(LoginBySocial_1.default);
    router.use(VerifCode_1.default);
    router.use(FetchingSiret_1.default);
    router.use(SendNotification_1.default);
    router.use(UpdatePasswordLost_1.default);
    router.use(Organisateur_1.default);
    router.use("/api", IsAuthenticated_1.default, invoice_routes_1.default);
    router.all("/test", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
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
                    if (firstBrace !== -1 &&
                        lastBrace !== -1 &&
                        lastBrace > firstBrace) {
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
                    return res
                        .status(404)
                        .json({ message: "Établissement introuvable" });
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
        else if (req.body.test === "send notif all users new establishment") {
            try {
                const { establishmentId } = req.body;
                if (!establishmentId) {
                    return res.status(400).json({
                        success: false,
                        message: "establishmentId est requis",
                    });
                }
                const establishment = yield Establishment_2.default.findById(establishmentId);
                if (!establishment) {
                    return res.status(404).json({
                        success: false,
                        message: "Établissement introuvable",
                    });
                }
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
                const establishmentIdStr = String(establishment._id);
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://entreprise/${establishmentIdStr}`)}`;
                const title = `🎉 ${establishment.name} arrive sur Localappy !`;
                const body = `Un nouvel établissement vient de rejoindre Localappy. Découvre sa page maintenant 👀`;
                const messages = [];
                const notificationMap = new Map();
                for (const user of validUsers) {
                    const notification = yield (0, notificationUtils_1.createQueuedNotification)({
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
            }
            catch (error) {
                console.error("Erreur notification nouvel établissement:", error);
                return res.status(500).json({
                    success: false,
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
                const title = `🎉 C’est maintenant !`;
                const body = `${event.title} est en cours sur Localappy 👀`;
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
        else if (req.body.test === "send notif all users one event") {
            try {
                const { eventId } = req.body;
                if (!eventId) {
                    return res.status(400).json({
                        success: false,
                        message: "eventId manquant",
                    });
                }
                const event = yield Event_2.default.findById(eventId);
                if (!event) {
                    return res.status(404).json({
                        success: false,
                        message: "Événement introuvable",
                    });
                }
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
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://event/${String(event._id)}`)}`;
                const title = `🎉 C’est maintenant !`;
                const body = `${event.title} est en cours sur Localappy 👀`;
                const messages = [];
                const notificationMap = new Map();
                for (const user of validUsers) {
                    const notification = yield (0, notificationUtils_1.createQueuedNotification)({
                        userId: String(user._id),
                        title,
                        body,
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
                    message: "Notification événement envoyée à tous les utilisateurs",
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
                                const tokenInvalid = ((_h = ticket.details) === null || _h === void 0 ? void 0 : _h.error) === "DeviceNotRegistered";
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
                const title = `☀️ Des idées pour ton weekend ?`;
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
                                const tokenInvalid = ((_j = ticket.details) === null || _j === void 0 ? void 0 : _j.error) === "DeviceNotRegistered";
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
        else if (req.body.test === "send notif all users one event") {
            try {
                const { eventId } = req.body;
                if (!eventId) {
                    return res.status(400).json({
                        success: false,
                        message: "eventId requis",
                    });
                }
                const event = yield Event_2.default.findById(eventId).populate("organizer.establishment");
                if (!event) {
                    return res.status(404).json({
                        success: false,
                        message: "Événement introuvable",
                    });
                }
                const establishment = (_k = event.organizer) === null || _k === void 0 ? void 0 : _k.establishment;
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
                const deepLink = `https://localappy.fr/open?link=${encodeURIComponent(`localappy://event/${String(event._id)}`)}`;
                const title = `🎉 Nouvel événement sur Localappy`;
                const body = `${event.title} est maintenant disponible${(establishment === null || establishment === void 0 ? void 0 : establishment.name) ? ` chez ${establishment.name}` : ""} 👀`;
                const messages = [];
                const notificationMap = new Map();
                for (const user of validUsers) {
                    const notification = yield (0, notificationUtils_1.createQueuedNotification)({
                        userId: String(user._id),
                        title,
                        body,
                        establishmentId: (establishment === null || establishment === void 0 ? void 0 : establishment._id)
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
                                const tokenInvalid = ((_l = ticket.details) === null || _l === void 0 ? void 0 : _l.error) === "DeviceNotRegistered";
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
                    message: "Notification événement envoyée à tous les utilisateurs valides",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsNkRBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qiw0REFBd0M7QUFFeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbEMsZ0VBQXdDO0FBR3hDLDJEQUF5QztBQUN6QywyREFBeUM7QUFDekMsMkVBQXlEO0FBQ3pELGlFQUErQztBQUMvQywyREFBd0M7QUFDeEMsMkRBQXlDO0FBQ3pDLCtEQUE0QztBQUM1QywyRUFBc0Q7QUFDdEQsbUVBQWlEO0FBQ2pELHFFQUFrRDtBQUNsRCxpRkFBOEQ7QUFDOUQsK0RBQTZDO0FBQzdDLDJEQUF5QztBQUN6QywyRUFBaUU7QUFDakUsaUZBQTBEO0FBQzFELHFGQUFtRTtBQUNuRSx1REFBcUM7QUFDckMseUVBQXVEO0FBQ3ZELDZFQUFvRDtBQUNwRCx5RUFBc0Q7QUFDdEQsMkZBQXlFO0FBQ3pFLG1GQUFpRTtBQUNqRSxtRkFBa0U7QUFDbEUsbUZBQWlFO0FBQ2pFLG1GQUE4RDtBQUM5RCxpRUFBc0Q7QUFJdEQsb0ZBQW9FO0FBQ3BFLHFEQUFrRDtBQUdsRCwyREFBbUM7QUFDbkMseUVBQWlEO0FBQ2pELHlEQUFpQztBQUNqQyw4REFBc0M7QUFDdEMsaUVBQXlDO0FBQ3pDLG9EQUE0QjtBQUM1QiwyRUFBbUQ7QUFDbkQsaUVBR21DO0FBQ25DLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM1QyxNQUFNLElBQUksR0FB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