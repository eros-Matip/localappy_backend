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
router.post("/login", IsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email, password, newPassword, expoPushToken } = req.body;
        if (!email || !password) {
            yield (0, LogAudit_1.logAudit)({
                action: "login_failed",
                email,
                ip: req.ip,
                details: { reason: "Account not found" },
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
            ]),
            Admin_1.default.findOne({ email }),
            Owner_1.default.findOne({ email }),
        ]);
        if (!customerFinded && !adminFinded && !ownerFinded) {
            Retour_1.default.error("Account was not found");
            yield (0, LogAudit_1.logAudit)({
                action: "login_failed",
                email,
                ip: req.ip,
                details: { reason: "Account not found" },
            });
            return res.status(401).json({ message: "Account was not found" });
        }
        const userFinded = customerFinded || adminFinded || ownerFinded;
        let role = "";
        if (adminFinded)
            role = "admin";
        else if (ownerFinded)
            role = "owner";
        else if (customerFinded)
            role = "customer";
        if (userFinded &&
            ((_a = userFinded.passwordLosted) === null || _a === void 0 ? void 0 : _a.status) === true &&
            password === userFinded.passwordLosted.code) {
            if (!newPassword) {
                yield (0, LogAudit_1.logAudit)({
                    action: "password_reset",
                    email: userFinded.email,
                    role,
                    ip: req.ip,
                });
                return res.status(400).json({
                    message: "New password is required to reset your password",
                });
            }
            const newSalt = uid2(16);
            const newHash = SHA256(newPassword + newSalt).toString(encBase64);
            userFinded.salt = newSalt;
            userFinded.hash = newHash;
            userFinded.passwordLosted.status = false;
            userFinded.passwordLosted.code = null;
            yield userFinded.save();
            Retour_1.default.log(`Mot de passe mis à jour pour ${userFinded.email}`);
            yield (0, LogAudit_1.logAudit)({
                action: "password_reset",
                email: userFinded.email,
                role,
                ip: req.ip,
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
            Retour_1.default.log(`${userFinded.account.firstname} ${userFinded.account.name} is logged`);
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
                ip: req.ip,
            });
            return res.status(200).json({
                message: "Logged in with email and password",
                user: userFinded,
                role,
            });
        }
        else {
            Retour_1.default.error("Invalid password");
            yield (0, LogAudit_1.logAudit)({
                action: "login_failed",
                email,
                ip: req.ip,
                details: { reason: "Invalid password" },
            });
            return res.status(401).json({ message: "Invalid password" });
        }
    }
    catch (error) {
        Retour_1.default.error({ message: "Error caught", error });
        return res.status(500).json({ message: "Error caught", error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwrREFBdUM7QUFDdkMscUZBQWtFO0FBRWxFLGtFQUEwQztBQUMxQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLGtEQUErQztBQUUvQyxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sQ0FBQyxJQUFJLENBQ1QsUUFBUSxFQUNSLHlCQUFvQixFQUNwQixDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDcEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFakUsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBQSxtQkFBUSxFQUFDO2dCQUNiLE1BQU0sRUFBRSxjQUFjO2dCQUN0QixLQUFLO2dCQUNMLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDVixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUU7YUFDekMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBR0QsTUFBTSxDQUFDLGNBQWMs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