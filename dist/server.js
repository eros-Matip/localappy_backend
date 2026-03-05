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
const Honeypot_1 = require("./middlewares/Honeypot");
const Event_2 = __importDefault(require("./models/Event"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const Retour_1 = __importDefault(require("./library/Retour"));
const Customer_2 = __importDefault(require("./models/Customer"));
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
    router.use("/api", IsAuthenticated_1.default, invoice_routes_1.default);
    router.all("/test", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsNkRBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qiw0REFBd0M7QUFFeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbEMsZ0VBQXdDO0FBR3hDLDJEQUF5QztBQUN6QywyREFBeUM7QUFDekMsMkVBQXlEO0FBQ3pELGlFQUErQztBQUMvQywyREFBd0M7QUFDeEMsMkRBQXlDO0FBQ3pDLCtEQUE0QztBQUM1QywyRUFBc0Q7QUFDdEQsbUVBQWlEO0FBQ2pELHFFQUFrRDtBQUNsRCwrREFBNkM7QUFDN0MsMkRBQXlDO0FBQ3pDLDJFQUFpRTtBQUNqRSxpRkFBMEQ7QUFDMUQscUZBQW1FO0FBQ25FLHVEQUFxQztBQUNyQyx5RUFBdUQ7QUFDdkQsNkVBQW9EO0FBQ3BELHlFQUFzRDtBQUN0RCwyRkFBeUU7QUFDekUsbUZBQWlFO0FBQ2pFLG1GQUFrRTtBQUdsRSxvRkFBb0U7QUFDcEUscURBQWtEO0FBR2xELDJEQUFtQztBQUNuQyx5RUFBaUQ7QUFDakQseURBQWlDO0FBQ2pDLDhEQUFzQztBQUN0QyxpRUFBeUM7QUFFekMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssWUFBWSxDQUFDO0FBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQztBQUcvQyxVQUFVLENBQUMsTUFBTSxDQUFDO0lBQ2hCLFVBQVUsRUFBRSxPQUFP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