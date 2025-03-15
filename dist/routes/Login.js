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
const router = express_1.default.Router();
router.post("/login", IsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.body.admin) {
            const customerFindedByToken = yield Customer_1.default.findById(req.body.admin).populate([
                { path: "themesFavorites", model: "Theme" },
                { path: "eventsFavorites", model: "Event" },
                { path: "ownerAccount", model: "Owner", populate: "establishments" },
            ]);
            if (!customerFindedByToken) {
                return res.status(404).json({ message: "Customer not found" });
            }
            if (req.body.expoPushToken) {
                customerFindedByToken.expoPushToken = req.body.expoPushToken;
                yield customerFindedByToken.save();
            }
            return res.status(200).json({
                message: "Logged in with token",
                customer: customerFindedByToken,
            });
        }
        const { email, password, expoPushToken } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }
        const customerFinded = yield Customer_1.default.findOne({ email }).populate([
            { path: "themesFavorites", model: "Theme" },
            { path: "eventsFavorites", model: "Event" },
            { path: "ownerAccount", model: "Owner", populate: "establishments" },
        ]);
        const adminFinded = yield Admin_1.default.findOne({ email });
        if (!customerFinded && !adminFinded) {
            Retour_1.default.error("Account was not found");
            return res.status(401).json({ message: "Account was not found" });
        }
        const ownerFinded = yield Owner_1.default.findById(customerFinded === null || customerFinded === void 0 ? void 0 : customerFinded.ownerAccount);
        const hashToLog = customerFinded
            ? SHA256(password + customerFinded.salt).toString(encBase64)
            : null;
        const adminHashToLog = adminFinded
            ? SHA256(password + adminFinded.salt).toString(encBase64)
            : null;
        if (customerFinded && hashToLog === customerFinded.hash) {
            Retour_1.default.log(`${customerFinded.account.firstname} ${customerFinded.account.name} is logged`);
            const newToken = uid2(29);
            customerFinded.token = newToken;
            if (ownerFinded) {
                ownerFinded.token = newToken;
                yield ownerFinded.save();
            }
            if (expoPushToken) {
                customerFinded.expoPushToken = expoPushToken;
            }
            yield customerFinded.save();
            return res.status(200).json({
                message: "Logged in with email and password",
                customer: customerFinded,
            });
        }
        else if (adminFinded && adminHashToLog === adminFinded.hash) {
            return res.status(200).json({
                message: "Admin logged in successfully",
                admin: adminFinded,
            });
        }
        else {
            Retour_1.default.error("Invalid password");
            return res.status(401).json({ message: "Invalid password" });
        }
    }
    catch (error) {
        Retour_1.default.error({ message: "Error caught", error });
        return res.status(500).json({ message: "Error caught", error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwrREFBdUM7QUFDdkMscUZBQWtFO0FBRWxFLGtFQUEwQztBQUMxQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBRXBDLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFHaEMsTUFBTSxDQUFDLElBQUksQ0FDVCxRQUFRLEVBQ1IseUJBQW9CLEVBQ3BCLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ3BDLElBQUksQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixNQUFNLHFCQUFxQixHQUFHLE1BQU0sa0JBQVEsQ0FBQyxRQUFRLENBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUNmLENBQUMsUUFBUSxDQUFDO2dCQUNULEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7Z0JBQzNDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7Z0JBQzNDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRTthQUNyRSxDQUFDLENBQUM7WUFHSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFD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