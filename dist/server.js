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
const LoginBySocial_1 = __importDefault(require("./routes/LoginBySocial"));
const VerifCode_1 = __importDefault(require("./routes/VerifCode"));
const Contact_1 = __importDefault(require("./routes/Contact"));
const Admin_1 = __importDefault(require("./routes/Admin"));
const FetchingSiret_1 = __importDefault(require("./routes/FetchingSiret"));
const SendNotification_1 = __importDefault(require("./routes/SendNotification"));
const Logging_1 = __importDefault(require("./library/Logging"));
const IsAuthenticated_1 = __importDefault(require("./middlewares/IsAuthenticated"));
const Theme_1 = __importDefault(require("./models/Theme"));
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
    router.use(LoginBySocial_1.default);
    router.use(VerifCode_1.default);
    router.use(FetchingSiret_1.default);
    router.use(SendNotification_1.default);
    router.all("/test", IsAuthenticated_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield Theme_1.default.deleteMany({});
            console.log("Tous les thèmes existants ont été supprimés.");
            const themes = [
                { theme: "EntertainmentAndEvent", icon: "smile-o", color: "#FF6347" },
                { theme: "Market", icon: "shopping-cart", color: "#FFD700" },
                { theme: "PointOfInterest", icon: "map-marker", color: "#1E90FF" },
                { theme: "SaleEvent", icon: "tag", color: "#FF4500" },
                { theme: "Conference", icon: "microphone", color: "#6A5ACD" },
                { theme: "CulturalEvent", icon: "paint-brush", color: "#8A2BE2" },
                { theme: "ShowEvent", icon: "film", color: "#FF69B4" },
                { theme: "Concert", icon: "music", color: "#8B0000" },
                { theme: "LocalAnimation", icon: "magic", color: "#20B2AA" },
                { theme: "SocialEvent", icon: "group", color: "#32CD32" },
                { theme: "TheaterEvent", icon: "theater-masks", color: "#DAA520" },
                { theme: "BricABrac", icon: "handshake-o", color: "#8B4513" },
                { theme: "GarageSale", icon: "car", color: "#CD5C5C" },
                { theme: "Exhibition", icon: "image", color: "#B22222" },
                { theme: "SportsCompetition", icon: "futbol-o", color: "#228B22" },
                { theme: "SportsEvent", icon: "trophy", color: "#FFD700" },
                { theme: "FairOrShow", icon: "star", color: "#FF8C00" },
                { theme: "Festival", icon: "glass-cheers", color: "#FF7F50" },
                { theme: "Rambling", icon: "hiking", color: "#2E8B57" },
                { theme: "Game", icon: "gamepad", color: "#9400D3" },
                { theme: "Practice", icon: "chalkboard-teacher", color: "#4682B4" },
                { theme: "Product", icon: "box-open", color: "#D2691E" },
                { theme: "Traineeship", icon: "chalkboard", color: "#8B008B" },
                { theme: "OpenDay", icon: "umbrella", color: "#4169E1" },
                { theme: "ScreeningEvent", icon: "film", color: "#696969" },
                { theme: "ArtistSigning", icon: "paint-brush", color: "#2F4F4F" },
                { theme: "Visit", icon: "eye", color: "#2E8B57" },
                { theme: "Parade", icon: "flag", color: "#FF4500" },
                { theme: "Rally", icon: "road", color: "#708090" },
                { theme: "Commemoration", icon: "bell", color: "#D2B48C" },
                { theme: "VisualArtsEvent", icon: "palette", color: "#8A2BE2" },
                { theme: "ReligiousEvent", icon: "cross", color: "#8B4513" },
                { theme: "TraditionalCelebration", icon: "crown", color: "#FFD700" },
                { theme: "Carnival", icon: "user-secret", color: "#FF4500" },
                { theme: "BusinessEvent", icon: "briefcase", color: "#4682B4" },
                { theme: "Congress", icon: "users", color: "#6A5ACD" },
                { theme: "Seminar", icon: "book-open", color: "#483D8B" },
                { theme: "Opera", icon: "music", color: "#B0C4DE" },
                { theme: "ChildrensEvent", icon: "child", color: "#FFB6C1" },
                { theme: "CircusEvent", icon: "magic", color: "#FF4500" },
                { theme: "Recital", icon: "microphone", color: "#6A5ACD" },
                { theme: "TrainingWorkshop", icon: "tools", color: "#8B0000" },
                { theme: "Reading", icon: "book", color: "#4682B4" },
                { theme: "SportsDemonstration", icon: "dumbbell", color: "#2F4F4F" },
                { theme: "DanceEvent", icon: "dancer", color: "#FF69B4" },
                {
                    theme: "PilgrimageAndProcession",
                    icon: "walking",
                    color: "#808000",
                },
                { theme: "Harvest", icon: "tractor", color: "#8B4513" },
                {
                    theme: "IntroductionCourse",
                    icon: "chalkboard-teacher",
                    color: "#4169E1",
                },
                { theme: "PlaceOfInterest", icon: "landmark", color: "#1E90FF" },
                {
                    theme: "SportsAndLeisurePlace",
                    icon: "basketball-ball",
                    color: "#FFA500",
                },
                { theme: "Theater", icon: "theater-masks", color: "#DAA520" },
                { theme: "Cinema", icon: "film", color: "#696969" },
                { theme: "Cinematheque", icon: "video", color: "#808780" },
                {
                    theme: "FreePractice",
                    icon: "chalkboard-teacher",
                    color: "#2E8B57",
                },
                { theme: "Course", icon: "book-reader", color: "#8B0000" },
                { theme: "Accommodation", icon: "bed", color: "#4169E1" },
                { theme: "RentalAccommodation", icon: "home", color: "#8B4513" },
                { theme: "ActivityProvider", icon: "user-tie", color: "#4682B4" },
                { theme: "WorkMeeting", icon: "briefcase", color: "#483D8B" },
                { theme: "CircusPlace", icon: "magic", color: "#FF4500" },
                {
                    theme: "AntiqueAndSecondhandGoodDealer",
                    icon: "gavel",
                    color: "#8B4513",
                },
                { theme: "Store", icon: "store", color: "#FFD700" },
                { theme: "CulturalSite", icon: "landmark", color: "#8A2BE2" },
                { theme: "Competition", icon: "medal", color: "#FFD700" },
                { theme: "Tasting", icon: "wine-glass", color: "#B22222" },
                { theme: "Tour", icon: "route", color: "#2E8B57" },
                { theme: "WalkingTour", icon: "walking", color: "#708090" },
                { theme: "Cirque", icon: "mask", color: "#FF4500" },
                { theme: "NaturalHeritage", icon: "tree", color: "#228B22" },
                { theme: "Soirée", icon: "cocktail", color: "#9400D3" },
            ];
            for (const { theme, icon, color } of themes) {
                const newTheme = new Theme_1.default({ theme, icon, color });
                yield newTheme.save();
                console.log(`Thème ajouté: ${theme}, Icône: ${icon}, Couleur: ${color}`);
            }
            res.status(200).send({ message: "Thèmes mis à jour avec succès." });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour des thèmes:", error);
            res
                .status(500)
                .send({ message: "Erreur lors de la mise à jour des thèmes." });
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