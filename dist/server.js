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
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("./config/config"));
const cors_1 = __importDefault(require("cors"));
const express = require("express");
const router = express();
const cloudinary = require("cloudinary");
const cron = require("node-cron");
const CryptoJS = require("crypto-js");
mongoose_1.default
    .set("strictQuery", false)
    .connect(`${config_1.default.mongooseUrl}`, { retryWrites: true, w: "majority" })
    .then(() => {
    Logging_1.default.info("mongoDB is cennected");
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
const Event_1 = __importDefault(require("./routes/Event"));
const Owner_1 = __importDefault(require("./routes/Owner"));
const Establishment_1 = __importDefault(require("./routes/Establishment"));
const Customer_1 = __importDefault(require("./routes/Customer"));
const Login_1 = __importDefault(require("./routes/Login"));
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
const Logging_1 = __importDefault(require("./library/Logging"));
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const Event_2 = __importDefault(require("./models/Event"));
const Organisateur_1 = __importDefault(require("./routes/Organisateur"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const IsAuthenticated_2 = __importDefault(require("./middlewares/IsAuthenticated"));
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
    const allowedOrigins = ["http://localhost:3000"];
    const options = {
        origin: allowedOrigins,
    };
    router.use((0, cors_1.default)(options));
    router.use(express.json({}));
    router.use((req, res, next) => {
        res.on("finish", () => {
            Logging_1.default.info(`Server Started -> Methode: [${req.method}] - Url: [${req.originalUrl}] - Ip: [${req.socket.remoteAddress}] - Status: [${res.statusCode}]`);
        });
        next();
    });
    router.use(express.urlencoded({ extended: true }));
    router.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-with, Content-Type, Accept,Authorization");
        if (req.method == "OPTIONS") {
            res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
            return res.status(200).json({});
        }
        next();
    });
    router.use("/event/", Event_1.default);
    router.use("/owner/", Owner_1.default);
    router.use("/establishment/", Establishment_1.default);
    router.use("/customer/", Customer_1.default);
    router.use("/customer/", Customer_1.default);
    router.use("/contact/", Contact_1.default);
    router.use("/admin/", Admin_1.default);
    router.use("/ads/", Ads_1.default);
    router.use("/registration/", Registration_1.default);
    router.use(Login_1.default);
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
    http_1.default
        .createServer(router)
        .listen(config_1.default.port, () => Logging_1.default.info(`Server is started on new port ${config_1.default.port}`));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUVBLGdEQUF3QjtBQUN4Qix3REFBZ0M7QUFDaEMsNkRBQXFDO0FBQ3JDLGdEQUF3QjtBQUV4QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkMsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLENBQUM7QUFDekIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNsQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFdEMsa0JBQVE7S0FDTCxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQztLQUN6QixPQUFPLENBQUMsR0FBRyxnQkFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7S0FDdEUsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNULGlCQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDckMsV0FBVyxFQUFFLENBQUM7QUFDaEIsQ0FBQyxDQUFDO0tBQ0QsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7SUFDZixpQkFBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ25DLGlCQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBR0wsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUNoQixVQUFVLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlO0lBQ3ZDLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQjtJQUN2QyxVQUFVLEVB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