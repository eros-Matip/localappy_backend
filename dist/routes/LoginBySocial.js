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
            if (err)
                return reject(err);
            resolve(decoded);
        });
    });
};
router.post("/socialLogin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
                const tokenInfo = yield axios_1.default.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${accessToken}`);
                userData = {
                    email: tokenInfo.data.email,
                    given_name: tokenInfo.data.given_name,
                    family_name: tokenInfo.data.family_name,
                    picture: tokenInfo.data.picture,
                    sub: tokenInfo.data.sub,
                };
                if (process.env.GOOGLE_WEB_CLIENT_ID &&
                    tokenInfo.data.aud !== process.env.GOOGLE_WEB_CLIENT_ID) {
                    return res
                        .status(401)
                        .json({ message: "Invalid Google token audience" });
                }
            }
            catch (err) {
                const googleResponse = yield axios_1.default.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
                userData = googleResponse.data;
            }
            if (!(userData === null || userData === void 0 ? void 0 : userData.email)) {
                return res.status(400).json({ message: "Google token missing email" });
            }
        }
        else if (provider === "facebook") {
            const facebookResponse = yield axios_1.default.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
            const fb = facebookResponse.data;
            if (!(fb === null || fb === void 0 ? void 0 : fb.email)) {
                return res.status(400).json({
                    message: "Facebook account has no email OR permission 'email' not granted",
                });
            }
            const fullName = ((_a = fb === null || fb === void 0 ? void 0 : fb.name) !== null && _a !== void 0 ? _a : "").trim();
            const parts = fullName ? fullName.split(" ") : [];
            const given = parts.length ? parts[0] : "Utilisateur";
            const family = parts.length > 1 ? parts.slice(1).join(" ") : "";
            userData = {
                email: fb.email,
                given_name: given,
                family_name: family,
                picture: "https://example.com/default-avatar.png",
                sub: fb.id,
            };
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
                    firstname: userData.given_name || userData.name || "Utilisateur",
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
            if (expoPushToken)
                customer.expoPushToken = expoPushToken;
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