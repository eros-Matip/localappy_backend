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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const node_cron_1 = __importDefault(require("node-cron"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const config_1 = __importDefault(require("./config/config"));
const socket_1 = require("./utils/socket");
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
const Organisateur_1 = __importDefault(require("./routes/Organisateur"));
const Registration_2 = __importDefault(require("./models/Registration"));
const Bill_1 = __importDefault(require("./models/Bill"));
const Event_2 = __importDefault(require("./models/Event"));
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const IsAuthenticated_2 = __importDefault(require("./middlewares/IsAuthenticated"));
const Logging_1 = __importDefault(require("./library/Logging"));
const app = (0, express_1.default)();
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
});
(function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            mongoose_1.default
                .set("strictQuery", false)
                .connect(`${config_1.default.mongooseUrl}`, { retryWrites: true, w: "majority" })
                .then(() => {
                Logging_1.default.info("mongoDB is cennected");
            })
                .catch((error) => {
                Logging_1.default.error("Unable to connect");
                Logging_1.default.error(error);
            });
            Logging_1.default.info("MongoDB connected");
            const allowedOrigins = ["http://localhost:3000"];
            app.use((0, cors_1.default)({ origin: allowedOrigins }));
            app.use(express_1.default.json());
            app.use(express_1.default.urlencoded({ extended: true }));
            app.use((req, res, next) => {
                res.on("finish", () => {
                    Logging_1.default.info(`[${req.method}] ${req.originalUrl} - ${req.socket.remoteAddress} - ${res.statusCode}`);
                });
                next();
            });
            app.use((req, res, next) => {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-with, Content-Type, Accept, Authorization");
                if (req.method === "OPTIONS") {
                    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
                    return res.status(200).json({});
                }
                next();
            });
            app.use("/event", Event_1.default);
            app.use("/owner", Owner_1.default);
            app.use("/establishment", Establishment_1.default);
            app.use("/customer", Customer_1.default);
            app.use("/contact", Contact_1.default);
            app.use("/admin", Admin_1.default);
            app.use("/ads", Ads_1.default);
            app.use("/registration", Registration_1.default);
            app.use(Login_1.default);
            app.use(Payment_1.default);
            app.use(ResendCode_1.default);
            app.use(LoginBySocial_1.default);
            app.use(VerifCode_1.default);
            app.use(FetchingSiret_1.default);
            app.use(SendNotification_1.default);
            app.use(UpdatePasswordLost_1.default);
            app.use("/organisateur", Organisateur_1.default);
            app.use("/api", IsAuthenticated_2.default, invoice_routes_1.default);
            app.all("/test", IsAuthenticated_1.default, (_req, res) => __awaiter(this, void 0, void 0, function* () {
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
            app.use((req, res) => {
                const message = `Route not found -> [${req.method}] ${req.originalUrl}`;
                Logging_1.default.error(message);
                return res.status(404).json(message);
            });
            node_cron_1.default.schedule("0 0 0 * * *", () => __awaiter(this, void 0, void 0, function* () {
                Logging_1.default.info("🔄 [CRON] Nettoyage des registrations pending...");
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                try {
                    const pending = yield Registration_2.default.find({
                        status: "pending",
                        date: { $lt: oneDayAgo },
                    });
                    for (const reg of pending) {
                        const bill = yield Bill_1.default.findOne({
                            registration: reg._id,
                            status: "pending",
                        });
                        if (bill)
                            yield bill.deleteOne();
                        yield reg.deleteOne();
                    }
                    Logging_1.default.info("✅ [CRON] Nettoyage terminé.");
                }
                catch (err) {
                    Logging_1.default.error(`❌ [CRON] ${String(err)}`);
                }
            }));
            const server = (0, socket_1.initSocket)(app);
            const PORT = Number(config_1.default.port || 4000);
            server.listen(PORT, () => Logging_1.default.info(`HTTP + Socket.IO listening on :${PORT}`));
            const shutdown = () => {
                Logging_1.default.info("Shutting down...");
                server.close(() => {
                    mongoose_1.default.connection.close(false).then(() => process.exit(0));
                });
            };
            process.on("SIGINT", shutdown);
            process.on("SIGTERM", shutdown);
            module.exports = { app, server };
        }
        catch (err) {
            Logging_1.default.error(`Bootstrap error: ${String(err)}`);
            process.exit(1);
        }
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLHlCQUF1QjtBQUN2QixzREFBbUU7QUFDbkUsZ0RBQXdCO0FBRXhCLHdEQUFnQztBQUNoQywwREFBNkI7QUFDN0IsNERBQW9DO0FBQ3BDLDZEQUFxQztBQUdyQywyQ0FBNEM7QUFHNUMsMkRBQXlDO0FBQ3pDLDJEQUF5QztBQUN6QywyRUFBeUQ7QUFDekQsaUVBQStDO0FBQy9DLDJEQUF3QztBQUN4QywrREFBNEM7QUFDNUMsMkVBQXNEO0FBQ3RELG1FQUFpRDtBQUNqRCxxRUFBa0Q7QUFDbEQsK0RBQTZDO0FBQzdDLDJEQUF5QztBQUN6QywyRUFBaUU7QUFDakUsaUZBQTBEO0FBQzFELHFGQUFtRTtBQUNuRSx1REFBcUM7QUFDckMseUVBQXVEO0FBQ3ZELDZFQUFvRDtBQUNwRCx5RUFBc0Q7QUFHdEQseUVBQWlEO0FBQ2pELHlEQUFpQztBQUNqQywyREFBbUM7QUFHbkMsb0ZBQWlFO0FBQ2pFLG9GQUFvRTtBQUNwRSxnRUFBd0M7QUFFeEMsTUFBTSxHQUFHLEdBQUcsSUFBQSxpQkFBTyxHQUFFLENBQUM7QUFHdEIsb0JBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ25CLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWU7SUFDdkMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCO0lBQ3ZDLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQjtDQUM5QyxDQUFDLENBQUM7QUFFSCxDQUFDLFNBQWUsU0FBUzs7UUFDdkIsSUFBSSxDQUFDO1lBQ0gsa0JBQVE7aUJBQ0wsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7aUJBQ3pCLE9BQU8sQ0FBQyxHQUFHLGdCQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUs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