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
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const IsAuthenticated_2 = __importDefault(require("./middlewares/IsAuthenticated"));
const Event_2 = __importDefault(require("./models/Event"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const isProd = process.env.NODE_ENV === "production";
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
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
});
const startServer = () => {
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
        res.on("finish", () => {
            Logging_1.default.info(`Server Started -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}] - Status: [${res.statusCode}]`);
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
    }));
    router.use((req, res) => {
        const error = new Error(`Route has been not found -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}]`);
        Logging_1.default.error(error.message);
        return res.status(404).json(error.message);
    });
    const server = (0, socket_1.default)(router);
    server.listen(config_1.default.port, () => {
        Logging_1.default.info(`Server + Socket started on port ${config_1.default.port}`);
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUVBLHdEQUFnQztBQUNoQyw2REFBcUM7QUFDckMsZ0RBQXdCO0FBQ3hCLDREQUF3QztBQUV4QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkMsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLENBQUM7QUFDekIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUdsQyxnRUFBd0M7QUFHeEMsMkRBQXlDO0FBQ3pDLDJEQUF5QztBQUN6QywyRUFBeUQ7QUFDekQsaUVBQStDO0FBQy9DLDJEQUF3QztBQUN4QywyREFBeUM7QUFDekMsK0RBQTRDO0FBQzVDLDJFQUFzRDtBQUN0RCxtRUFBaUQ7QUFDakQscUVBQWtEO0FBQ2xELCtEQUE2QztBQUM3QywyREFBeUM7QUFDekMsMkVBQWlFO0FBQ2pFLGlGQUEwRDtBQUMxRCxxRkFBbUU7QUFDbkUsdURBQXFDO0FBQ3JDLHlFQUF1RDtBQUN2RCw2RUFBb0Q7QUFDcEQseUVBQXNEO0FBR3RELG9GQUFpRTtBQUNqRSxvRkFBb0U7QUFHcEUsMkRBQW1DO0FBQ25DLHlFQUFpRDtBQUNqRCx5REFBaUM7QUFFakMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssWUFBWSxDQUFDO0FBRXJELGtCQUFRO0tBQ0wsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7S0FDekIsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQztLQUN6QixPQUFPLENBQUMsR0FBRyxnQkFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFO0lBQ2hDLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLENBQUMsRUFBRSxV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