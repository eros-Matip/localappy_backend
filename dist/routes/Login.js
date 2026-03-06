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
const TrackloginStat_1 = require("../library/TrackloginStat");
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
            yield (0, TrackloginStat_1.trackLoginStat)({
                role: role,
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwrREFBdUM7QUFDdkMscUZBQWtFO0FBRWxFLGtFQUEwQztBQUMxQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLGtEQUErQztBQUMvQyw4REFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQU1oQyxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQVksRUFBRSxFQUFFO0lBQ25DLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMzQyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFBRSxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDN0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUNoQixDQUFDLENBQUM7QUFLRixNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQVksRUFBRSxNQUE0QixFQUFFLEVBQUU7O0lBQ3JFLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lB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