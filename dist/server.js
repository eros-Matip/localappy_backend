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
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const IsAuthenticated_2 = __importDefault(require("./middlewares/IsAuthenticated"));
const Honeypot_1 = require("./middlewares/Honeypot");
const Event_2 = __importDefault(require("./models/Event"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const Retour_1 = __importDefault(require("./library/Retour"));
const Customer_2 = __importDefault(require("./models/Customer"));
const openai_1 = __importDefault(require("openai"));
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
    router.use("/api", IsAuthenticated_2.default, invoice_routes_1.default);
    router.all("/test", IsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsNkRBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qiw0REFBd0M7QUFFeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbEMsZ0VBQXdDO0FBR3hDLDJEQUF5QztBQUN6QywyREFBeUM7QUFDekMsMkVBQXlEO0FBQ3pELGlFQUErQztBQUMvQywyREFBd0M7QUFDeEMsMkRBQXlDO0FBQ3pDLCtEQUE0QztBQUM1QywyRUFBc0Q7QUFDdEQsbUVBQWlEO0FBQ2pELHFFQUFrRDtBQUNsRCwrREFBNkM7QUFDN0MsMkRBQXlDO0FBQ3pDLDJFQUFpRTtBQUNqRSxpRkFBMEQ7QUFDMUQscUZBQW1FO0FBQ25FLHVEQUFxQztBQUNyQyx5RUFBdUQ7QUFDdkQsNkVBQW9EO0FBQ3BELHlFQUFzRDtBQUN0RCwyRkFBeUU7QUFDekUsbUZBQWlFO0FBQ2pFLG1GQUFrRTtBQUVsRSxvRkFBaUU7QUFDakUsb0ZBQW9FO0FBQ3BFLHFEQUFrRDtBQUdsRCwyREFBbUM7QUFDbkMseUVBQWlEO0FBQ2pELHlEQUFpQztBQUNqQyw4REFBc0M7QUFDdEMsaUVBQXlDO0FBQ3pDLG9EQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFNLENBQUM7SUFDeEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYztDQUNuQyxDQUFDLENBQUM7QUFFSCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FB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