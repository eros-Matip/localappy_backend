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
const express_1 = __importDefault(require("express"));
const Customer_1 = __importDefault(require("../models/Customer"));
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uid2 = require("uid2");
const Retour_1 = __importDefault(require("../library/Retour"));
const router = express_1.default.Router();
router.post("/socialLogin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { provider, accessToken, idToken } = req.body;
    if (!provider || (!accessToken && !idToken)) {
        Retour_1.default.error("Provider and accessToken or idToken are required");
        return res
            .status(400)
            .json({ message: "Provider and accessToken or idToken are required" });
    }
    try {
        let userData;
        if (provider === "google") {
            const googleResponse = yield axios_1.default.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
            userData = googleResponse.data;
        }
        else if (provider === "facebook") {
            const facebookResponse = yield axios_1.default.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
            userData = facebookResponse.data;
        }
        else if (provider === "apple") {
            const decodedToken = jsonwebtoken_1.default.decode(idToken, { complete: true });
            if (!decodedToken) {
                Retour_1.default.error("Invalid Apple ID token");
                return res.status(400).json({ message: "Invalid Apple ID token" });
            }
            const { email, sub: appleUserId } = decodedToken.payload;
            if (!email) {
                Retour_1.default.error("Apple ID token is missing email");
                return res
                    .status(400)
                    .json({ message: "Apple ID token is missing email" });
            }
            userData = {
                email,
                appleUserId,
                given_name: decodedToken.payload.given_name || "Utilisateur",
                family_name: decodedToken.payload.family_name || "",
            };
        }
        else {
            Retour_1.default.error("Invalid provider");
            return res.status(400).json({ message: "Invalid provider" });
        }
        let customer = yield Customer_1.default.findOne({ email: userData.email }).populate([
            {
                path: "themesFavorites",
                model: "Theme",
            },
            {
                path: "eventsFavorites",
                model: "Event",
            },
            { path: "ownerAccount", model: "Owner" },
        ]);
        if (!customer) {
            customer = new Customer_1.default({
                account: {
                    firstname: userData.given_name || userData.name,
                    name: userData.family_name || "",
                },
                picture: {
                    url: userData.picture || null,
                    public_id: "from" + provider.charAt(0).toUpperCase() + provider.slice(1),
                },
                email: userData.email,
                token: uid2(29),
            });
            yield customer.save();
        }
        else {
            customer.token = uid2(29);
            yield customer.save();
        }
        Retour_1.default.info("Social login successful");
        return res.status(200).json({
            message: "Social login successful",
            customer,
        });
    }
    catch (error) {
        Retour_1.default.error("Erreur de connexion sociale");
        return res.status(500).json({
            message: "Une erreur est survenue lors de la connexion sociale",
            error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW5CeVNvY2lhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvTG9naW5CeVNvY2lhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxrRUFBMEM7QUFDMUMsa0RBQTBCO0FBQzFCLGdFQUErQjtBQUMvQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsK0RBQXVDO0FBRXZDLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDaEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztJQUVwRCxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzVDLGdCQUFNLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFDakUsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxrREFBa0QsRUFBRSxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILElBQUksUUFBYSxDQUFDO1FBR2xCLElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE1BQU0sY0FBYyxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDcEMsOERBQThELFdBQVcsRUFBRSxDQUM1RSxDQUFDO1lBQ0YsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDakMsQ0FBQzthQUFNLElBQUksUUFBUSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ25DLE1BQU0sZ0JBQWdCLEdB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