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
const TrackloginStat_1 = require("../library/TrackloginStat");
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
        yield (0, TrackloginStat_1.trackLoginStat)({
            role: "customer",
        });
        Retour_1.default.info(`${customer.account.firstname} ${customer.account.name} logged by Social login`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW5CeVNvY2lhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvTG9naW5CeVNvY2lhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxrRUFBMEM7QUFDMUMsa0RBQTBCO0FBQzFCLGdFQUErQjtBQUMvQix3REFBa0M7QUFDbEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLCtEQUF1QztBQUN2Qyw4REFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLE1BQU0sR0FBRyxJQUFBLGtCQUFVLEVBQUM7SUFDeEIsT0FBTyxFQUFFLHFDQUFxQztDQUMvQyxDQUFDLENBQUM7QUFFSCxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQVcsRUFBRSxRQUFhLEVBQUUsRUFBRTtJQUM1QyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDNUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNSLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLFVBQVUsR0FBRyxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsWUFBWSxFQUFFLENBQUM7WUFDdkMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsV0FBbUIsRUFBRSxFQUFFO0lBQy9DLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsc0JBQUcsQ0FBQyxNQUFNLENBQ1IsV0FBVyxFQUNY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