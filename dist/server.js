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
const AdminCompaniesControl_1 = __importDefault(require("./routes/AdminCompaniesControl"));
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const IsAuthenticated_2 = __importDefault(require("./middlewares/IsAuthenticated"));
const Event_2 = __importDefault(require("./models/Event"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const Retour_1 = __importDefault(require("./library/Retour"));
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
    router.use("/companiesControl/", AdminCompaniesControl_1.default);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUVBLHdEQUFnQztBQUNoQyw2REFBcUM7QUFDckMsZ0RBQXdCO0FBQ3hCLDREQUF3QztBQUV4QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkMsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLENBQUM7QUFDekIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUdsQyxnRUFBd0M7QUFHeEMsMkRBQXlDO0FBQ3pDLDJEQUF5QztBQUN6QywyRUFBeUQ7QUFDekQsaUVBQStDO0FBQy9DLDJEQUF3QztBQUN4QywyREFBeUM7QUFDekMsK0RBQTRDO0FBQzVDLDJFQUFzRDtBQUN0RCxtRUFBaUQ7QUFDakQscUVBQWtEO0FBQ2xELCtEQUE2QztBQUM3QywyREFBeUM7QUFDekMsMkVBQWlFO0FBQ2pFLGlGQUEwRDtBQUMxRCxxRkFBbUU7QUFDbkUsdURBQXFDO0FBQ3JDLHlFQUF1RDtBQUN2RCw2RUFBb0Q7QUFDcEQseUVBQXNEO0FBQ3RELDJGQUF5RTtBQUd6RSxvRkFBaUU7QUFDakUsb0ZBQW9FO0FBR3BFLDJEQUFtQztBQUNuQyx5RUFBaUQ7QUFDakQseURBQWlDO0FBQ2pDLDhEQUFzQztBQUV0QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUM7QUFFckQsa0JBQVE7S0FDTCxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQztLQUN6QixHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDO0tBQ3pCLE9BQU8sQ0FBQyxHQUFHLGdCQUFNLENBQUMsV0FBVyxFQUFFLEVBQUU7SUFDaEMsV0FBVyxF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