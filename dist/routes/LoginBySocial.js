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
            try {
                const googleResponse = yield axios_1.default.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
                userData = googleResponse.data;
            }
            catch (err) {
                const tokenInfo = yield axios_1.default.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${accessToken}`);
                userData = {
                    email: tokenInfo.data.email,
                    given_name: tokenInfo.data.given_name,
                    family_name: tokenInfo.data.family_name,
                    picture: tokenInfo.data.picture,
                    sub: tokenInfo.data.sub,
                };
            }
            if (!(userData === null || userData === void 0 ? void 0 : userData.email)) {
                return res.status(400).json({ message: "Google token missing email" });
            }
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
            { path: "eventsReserved", model: "Event" },
            { path: "eventsFavorites", model: "Event" },
            { path: "ownerAccount", model: "Owner", populate: "establishments" },
            { path: "establishmentStaffOf", model: "Establishment" },
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