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
const facebookClient = (0, jwks_rsa_1.default)({
    jwksUri: "https://www.facebook.com/.well-known/oauth/openid/jwks/",
});
const getFacebookKey = (header, callback) => {
    facebookClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err, null);
        }
        else {
            const signingKey = key === null || key === void 0 ? void 0 : key.getPublicKey();
            callback(null, signingKey);
        }
    });
};
const verifyFacebookAuthenticationToken = (authenticationToken) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(authenticationToken, getFacebookKey, {
            algorithms: ["RS256"],
            audience: "503623619325287",
            issuer: "https://www.facebook.com",
        }, (err, decoded) => {
            if (err)
                return reject(err);
            resolve(decoded);
        });
    });
};
router.post("/socialLogin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const { provider, accessToken, tokenType, expoPushToken } = req.body;
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
            if (tokenType === "authentication_token") {
                try {
                    const decodedToken = yield verifyFacebookAuthenticationToken(accessToken);
                    console.log("FACEBOOK LIMITED TOKEN DECODED =", decodedToken);
                    const facebookUserId = decodedToken.sub;
                    const email = decodedToken.email;
                    if (!facebookUserId) {
                        return res.status(400).json({
                            message: "Facebook authentication token missing sub",
                        });
                    }
                    if (!email) {
                        return res.status(400).json({
                            message: "Facebook Limited Login token missing email. Impossible de créer le compte sans email.",
                        });
                    }
                    userData = {
                        email,
                        given_name: decodedToken.given_name ||
                            ((_b = (_a = decodedToken.name) === null || _a === void 0 ? void 0 : _a.split(" ")) === null || _b === void 0 ? void 0 : _b[0]) ||
                            "Utilisateur",
                        family_name: decodedToken.family_name ||
                            ((_d = (_c = decodedToken.name) === null || _c === void 0 ? void 0 : _c.split(" ")) === null || _d === void 0 ? void 0 : _d.slice(1).join(" ")) ||
                            "",
                        picture: decodedToken.picture || "https://example.com/default-avatar.png",
                        sub: facebookUserId,
                    };
                }
                catch (error) {
                    console.log("FACEBOOK LIMITED TOKEN ERROR =", error === null || error === void 0 ? void 0 : error.message);
                    return res.status(400).json({
                        message: "Invalid Facebook authentication token",
                        error: error === null || error === void 0 ? void 0 : error.message,
                    });
                }
            }
            else {
                try {
                    const facebookResponse = yield axios_1.default.get("https://graph.facebook.com/v20.0/me", {
                        params: {
                            fields: "id,name,email",
                            access_token: accessToken,
                        },
                    });
                    const fb = facebookResponse.data;
                    console.log("FACEBOOK ME RESPONSE =", fb);
                    if (!(fb === null || fb === void 0 ? void 0 : fb.id)) {
                        return res.status(400).json({
                            message: "Facebook token invalid: missing id",
                        });
                    }
                    if (!(fb === null || fb === void 0 ? void 0 : fb.email)) {
                        return res.status(400).json({
                            message: "Facebook account has no email OR permission 'email' not granted",
                            facebookUser: {
                                id: fb.id,
                                name: fb.name,
                            },
                        });
                    }
                    const fullName = ((_e = fb === null || fb === void 0 ? void 0 : fb.name) !== null && _e !== void 0 ? _e : "").trim();
                    const parts = fullName ? fullName.split(" ") : [];
                    const given = parts.length ? parts[0] : "Utilisateur";
                    const family = parts.length > 1 ? parts.slice(1).join(" ") : "";
                    userData = {
                        email: fb.email,
                        given_name: given,
                        family_name: family,
                        picture: `https://graph.facebook.com/${fb.id}/picture?type=large`,
                        sub: fb.id,
                    };
                }
                catch (error) {
                    console.log("FACEBOOK ME ERROR STATUS =", (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.status);
                    console.log("FACEBOOK ME ERROR DATA =", (_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data);
                    console.log("FACEBOOK ME ERROR MESSAGE =", error === null || error === void 0 ? void 0 : error.message);
                    return res.status(400).json({
                        message: "Invalid Facebook access token",
                        facebookError: ((_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.data) || (error === null || error === void 0 ? void 0 : error.message),
                    });
                }
            }
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
        console.log("SOCIAL LOGIN ERROR STATUS =", (_j = error === null || error === void 0 ? void 0 : error.response) === null || _j === void 0 ? void 0 : _j.status);
        console.log("SOCIAL LOGIN ERROR DATA =", (_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data);
        console.log("SOCIAL LOGIN ERROR MESSAGE =", error === null || error === void 0 ? void 0 : error.message);
        return res.status(500).json({
            message: "Une erreur est survenue lors de la connexion sociale",
            error: ((_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.data) || (error === null || error === void 0 ? void 0 : error.message),
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW5CeVNvY2lhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvTG9naW5CeVNvY2lhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxrRUFBMEM7QUFDMUMsa0RBQTBCO0FBQzFCLGdFQUErQjtBQUMvQix3REFBa0M7QUFDbEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLCtEQUF1QztBQUN2Qyw4REFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLE1BQU0sR0FBRyxJQUFBLGtCQUFVLEVBQUM7SUFDeEIsT0FBTyxFQUFFLHFDQUFxQztDQUMvQyxDQUFDLENBQUM7QUFFSCxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQVcsRUFBRSxRQUFhLEVBQUUsRUFBRTtJQUM1QyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDNUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNSLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLFVBQVUsR0FBRyxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsWUFBWSxFQUFFLENBQUM7WUFDdkMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsV0FBbUIsRUFBRSxFQUFFO0lBQy9DLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsc0JBQUcsQ0FBQyxNQUFNLENBQ1IsV0FBVyxFQUNY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