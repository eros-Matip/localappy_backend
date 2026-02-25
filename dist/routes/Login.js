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
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const Retour_1 = __importDefault(require("../library/Retour"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Owner_1 = __importDefault(require("../models/Owner"));
const Admin_1 = __importDefault(require("../models/Admin"));
const LogAudit_1 = require("../library/LogAudit");
const router = express_1.default.Router();
const getClientIp = (req) => {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string")
        return xff.split(",")[0].trim();
    if (Array.isArray(xff))
        return xff[0];
    return req.ip;
};
const buildLogContext = (req, extras) => {
    var _a, _b, _c, _d, _e;
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];
    const origin = req.headers["origin"];
    const referer = req.headers["referer"];
    const host = req.headers["host"];
    const context = Object.assign({ ts: new Date().toISOString(), endpoint: `${req.method} ${req.originalUrl}`, ip, forwardedFor: req.headers["x-forwarded-for"], realIp: req.headers["x-real-ip"], host,
        origin,
        referer,
        userAgent, cf: {
            country: req.headers["cf-ipcountry"],
            ray: req.headers["cf-ray"],
            connectingIp: req.headers["cf-connecting-ip"],
        }, client: {
            expoPushTokenProvided: Boolean((_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.expoPushToken),
            platform: (_b = req === null || req === void 0 ? void 0 : req.body) === null || _b === void 0 ? void 0 : _b.platform,
            appVersion: (_c = req === null || req === void 0 ? void 0 : req.body) === null || _c === void 0 ? void 0 : _c.appVersion,
            buildNumber: (_d = req === null || req === void 0 ? void 0 : req.body) === null || _d === void 0 ? void 0 : _d.buildNumber,
            deviceName: (_e = req === null || req === void 0 ? void 0 : req.body) === null || _e === void 0 ? void 0 : _e.deviceName,
        } }, extras);
    return context;
};
router.post("/login", IsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const requestId = uid2(10);
    try {
        const { email, password, newPassword, expoPushToken } = req.body;
        const baseContext = buildLogContext(req, {
            requestId,
            emailProvided: Boolean(email),
        });
        if (!email || !password) {
            Retour_1.default.error("LOGIN_FAILED missing_email_or_password", Object.assign(Object.assign({}, baseContext), { reason: "Email and password are required" }));
            yield (0, LogAudit_1.logAudit)({
                action: "login_failed",
                email,
                ip: getClientIp(req),
                details: { reason: "Email and password are required", requestId },
            });
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }
        const [customerFinded, adminFinded, ownerFinded] = yield Promise.all([
            Customer_1.default.findOne({ email }).populate([
                { path: "themesFavorites", model: "Theme" },
                { path: "eventsFavorites", model: "Event" },
                { path: "eventsReserved", model: "Event", populate: "registrations" },
                { path: "ownerAccount", model: "Owner", populate: "establishments" },
                { path: "establishmentStaffOf", model: "Establishment" },
            ]),
            Admin_1.default.findOne({ email }),
            Owner_1.default.findOne({ email }),
        ]);
        if (!customerFinded && !adminFinded && !ownerFinded) {
            const msg = `Account with this mail: "${email}" was not found`;
            Retour_1.default.error("LOGIN_FAILED account_not_found", Object.assign(Object.assign({}, baseContext), { email, reason: msg }));
            yield (0, LogAudit_1.logAudit)({
                action: "login_failed",
                email,
                ip: getClientIp(req),
                details: { reason: msg, requestId },
            });
            return res.status(401).json({
                message: msg,
            });
        }
        const userFinded = customerFinded || adminFinded || ownerFinded;
        let role = "";
        if (adminFinded)
            role = "admin";
        else if (ownerFinded)
            role = "owner";
        else if (customerFinded)
            role = "customer";
        const userContext = buildLogContext(req, {
            requestId,
            email: userFinded === null || userFinded === void 0 ? void 0 : userFinded.email,
            role,
            userId: (_b = (_a = userFinded === null || userFinded === void 0 ? void 0 : userFinded._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a),
        });
        if (userFinded &&
            ((_c = userFinded.passwordLosted) === null || _c === void 0 ? void 0 : _c.status) === true &&
            password === userFinded.passwordLosted.code) {
            if (!newPassword) {
                Retour_1.default.error("PASSWORD_RESET_FAILED missing_new_password", Object.assign(Object.assign({}, userContext), { reason: "New password is required to reset your password" }));
                yield (0, LogAudit_1.logAudit)({
                    action: "password_reset",
                    email: userFinded.email,
                    role,
                    ip: getClientIp(req),
                    details: { reason: "missing_new_password", requestId },
                });
                return res.status(400).json({
                    message: "New password is required to reset your password",
                    role,
                });
            }
            const newSalt = uid2(16);
            const newHash = SHA256(newPassword + newSalt).toString(encBase64);
            userFinded.salt = newSalt;
            userFinded.hash = newHash;
            userFinded.passwordLosted.status = false;
            userFinded.passwordLosted.code = null;
            yield userFinded.save();
            Retour_1.default.log("PASSWORD_RESET_SUCCESS", Object.assign({}, userContext));
            yield (0, LogAudit_1.logAudit)({
                action: "password_reset",
                email: userFinded.email,
                role,
                ip: getClientIp(req),
                details: { requestId },
            });
            return res.status(200).json({
                message: "Password has been successfully updated.",
                role,
            });
        }
        const hashToLog = userFinded
            ? SHA256(password + userFinded.salt).toString(encBase64)
            : null;
        if (userFinded && hashToLog && hashToLog === userFinded.hash) {
            Retour_1.default.log("LOGIN_SUCCESS", Object.assign(Object.assign({}, userContext), { name: `${((_d = userFinded.account) === null || _d === void 0 ? void 0 : _d.firstname) || ""} ${((_e = userFinded.account) === null || _e === void 0 ? void 0 : _e.name) || ""}`.trim(), expoPushTokenUpdated: Boolean(expoPushToken) }));
            const newToken = uid2(26);
            userFinded.token = newToken;
            if (expoPushToken) {
                userFinded.expoPushToken = expoPushToken;
            }
            yield userFinded.save();
            yield (0, LogAudit_1.logAudit)({
                action: "login_success",
                email: userFinded.email,
                role,
                ip: getClientIp(req),
                details: { requestId },
            });
            return res.status(200).json({
                message: "Logged in with email and password",
                user: userFinded,
                role,
            });
        }
        else {
            Retour_1.default.error("LOGIN_FAILED invalid_password", Object.assign(Object.assign({}, userContext), { reason: "Invalid password" }));
            yield (0, LogAudit_1.logAudit)({
                action: "login_failed",
                email,
                ip: getClientIp(req),
                details: { reason: "Invalid password", requestId },
            });
            return res.status(401).json({ message: "Invalid password" });
        }
    }
    catch (error) {
        Retour_1.default.error("LOGIN_ERROR caught_exception", buildLogContext(req, { requestId, error }));
        return res.status(500).json({ message: "Error caught", error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwrREFBdUM7QUFDdkMscUZBQWtFO0FBRWxFLGtFQUEwQztBQUMxQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLGtEQUErQztBQUUvQyxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBTWhDLE1BQU0sV0FBVyxHQUFHLENBQUMsR0FBWSxFQUFFLEVBQUU7SUFDbkMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzNDLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUTtRQUFFLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEMsT0FBTyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQUtGLE1BQU0sZUFBZSxHQUFHLENBQUMsR0FBWSxFQUFFLE1BQTRCLEVBQUUsRUFBRTs7SUFDckUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUMsTUFBTSxNQUFN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