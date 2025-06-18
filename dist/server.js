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
const Logging_1 = __importDefault(require("./library/Logging"));
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const Event_2 = __importDefault(require("./models/Event"));
const startServer = () => {
    cron.schedule("0 0 0 * * *", () => {
        console.log("hello world");
    });
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
    router.use(Login_1.default);
    router.use(Payment_1.default);
    router.use(ResendCode_1.default);
    router.use(LoginBySocial_1.default);
    router.use(VerifCode_1.default);
    router.use(FetchingSiret_1.default);
    router.use(SendNotification_1.default);
    router.use(UpdatePasswordLost_1.default);
    router.all("/test", IsAuthenticated_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const result = yield Event_2.default.updateMany({ isDraft: true }, { $set: { isDraft: false } });
            res.status(200).send({
                message: `${result.modifiedCount} événements ont été mis à jour.`,
            });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour des événements:", error);
            res
                .status(500)
                .send({ message: "Erreur lors de la mise à jour des événements." });
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