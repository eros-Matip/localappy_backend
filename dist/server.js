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
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const IsAuthenticated_2 = __importDefault(require("./middlewares/IsAuthenticated"));
const Honeypot_1 = require("./middlewares/Honeypot");
const Event_2 = __importDefault(require("./models/Event"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const Retour_1 = __importDefault(require("./library/Retour"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsNkRBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qiw0REFBd0M7QUFFeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbEMsZ0VBQXdDO0FBR3hDLDJEQUF5QztBQUN6QywyREFBeUM7QUFDekMsMkVBQXlEO0FBQ3pELGlFQUErQztBQUMvQywyREFBd0M7QUFDeEMsMkRBQXlDO0FBQ3pDLCtEQUE0QztBQUM1QywyRUFBc0Q7QUFDdEQsbUVBQWlEO0FBQ2pELHFFQUFrRDtBQUNsRCwrREFBNkM7QUFDN0MsMkRBQXlDO0FBQ3pDLDJFQUFpRTtBQUNqRSxpRkFBMEQ7QUFDMUQscUZBQW1FO0FBQ25FLHVEQUFxQztBQUNyQyx5RUFBdUQ7QUFDdkQsNkVBQW9EO0FBQ3BELHlFQUFzRDtBQUN0RCwyRkFBeUU7QUFDekUsbUZBQWlFO0FBR2pFLG9GQUFpRTtBQUNqRSxvRkFBb0U7QUFDcEUscURBQWtEO0FBR2xELDJEQUFtQztBQUNuQyx5RUFBaUQ7QUFDakQseURBQWlDO0FBQ2pDLDhEQUFzQztBQUV0QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUM7QUFDckQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssTUFBTSxDQUFDO0FBRy9DLFVBQVUsQ0FBQyxNQUFNLENBQUM7SUFDaEIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENB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