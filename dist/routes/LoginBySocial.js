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
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const uid2 = require("uid2");
const Retour_1 = __importDefault(require("../library/Retour"));
const router = express_1.default.Router();
const client = (0, jwks_rsa_1.default)({
    jwksUri: "https://appleid.apple.com/auth/keys",
});
const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err, null);
        }
        else {
            const signingKey = key === null || key === void 0 ? void 0 : key.getPublicKey();
            callback(null, signingKey);
        }
    });
};
const verifyAppleToken = (accessToken) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(accessToken, getKey, {
            algorithms: ["RS256"],
            issuer: "https://appleid.apple.com",
        }, (err, decoded) => {
            if (err) {
                return reject(err);
            }
            resolve(decoded);
        });
    });
};
router.post("/socialLogin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { provider, accessToken, expoPushToken } = req.body;
    if (!provider || !accessToken) {
        Retour_1.default.error("Provider and accessToken are required");
        return res
            .status(400)
            .json({ message: "Provider and accessToken are required" });
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
            try {
                const decodedToken = yield verifyAppleToken(accessToken);
                const { email, sub: appleUserId } = decodedToken;
                if (!email) {
                    Retour_1.default.error("Apple ID token is missing email");
                    return res
                        .status(400)
                        .json({ message: "Apple ID token is missing email" });
                }
                userData = {
                    email,
                    appleUserId,
                    given_name: decodedToken.given_name || "Utilisateur",
                    family_name: decodedToken.family_name || "",
                };
            }
            catch (err) {
                Retour_1.default.error("Invalid Apple ID token");
                return res.status(400).json({ message: "Invalid Apple ID token", err });
            }
        }
        else {
            Retour_1.default.error("Invalid provider");
            return res.status(400).json({ message: "Invalid provider" });
        }
        let customer = yield Customer_1.default.findOne({ email: userData.email }).populate([
            { path: "themesFavorites", model: "Theme" },
            { path: "eventsFavorites", model: "Event" },
            { path: "ownerAccount", model: "Owner" },
        ]);
        if (!customer) {
            customer = new Customer_1.default({
                account: {
                    firstname: userData.given_name || userData.name,
                    name: userData.family_name || "",
                },
                picture: {
                    url: userData.picture || "https://example.com/default-avatar.png",
                    public_id: "from" + provider.charAt(0).toUpperCase() + provider.slice(1),
                },
                email: userData.email,
                token: uid2(29),
                expoPushToken: expoPushToken || null,
            });
            yield customer.save();
        }
        else {
            customer.token = uid2(29);
            if (expoPushToken) {
                customer.expoPushToken = expoPushToken;
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW5CeVNvY2lhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvTG9naW5CeVNvY2lhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxrRUFBMEM7QUFDMUMsa0RBQTBCO0FBQzFCLGdFQUErQjtBQUMvQix3REFBa0M7QUFDbEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLCtEQUF1QztBQUV2QyxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sTUFBTSxHQUFHLElBQUEsa0JBQVUsRUFBQztJQUN4QixPQUFPLEVBQUUscUNBQXFDO0NBQy9DLENBQUMsQ0FBQztBQUVILE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBVyxFQUFFLFFBQWEsRUFBRSxFQUFFO0lBQzVDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUM1QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1IsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNOLE1BQU0sVUFBVSxHQUFHLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxZQUFZLEVBQUUsQ0FBQztZQUN2QyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxXQUFtQixFQUFFLEVBQUU7SUFDL0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxzQkFBRyxDQUFDLE1BQU0sQ0FDUixXQUFXLEVBQ1gsTUFBTSxFQUNOO1lB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