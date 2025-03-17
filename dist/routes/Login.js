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
        const [customerFinded, adminFinded] = yield Promise.all([
            Customer_1.default.findOne({ email }).populate([
                { path: "themesFavorites", model: "Theme" },
                { path: "eventsFavorites", model: "Event" },
                { path: "ownerAccount", model: "Owner", populate: "establishments" },
            ]),
            Admin_1.default.findOne({ email }),
        ]);
        if (!customerFinded && !adminFinded) {
            Retour_1.default.error("Account was not found");
            return res.status(401).json({ message: "Account was not found" });
        }
        let ownerFinded = null;
        if (customerFinded === null || customerFinded === void 0 ? void 0 : customerFinded.ownerAccount) {
            ownerFinded = yield Owner_1.default.findById(customerFinded.ownerAccount);
        }
        const hashToLog = customerFinded
            ? SHA256(password + customerFinded.salt).toString(encBase64)
            : null;
        const adminHashToLog = adminFinded
            ? SHA256(password + adminFinded.salt).toString(encBase64)
            : null;
        if (customerFinded && hashToLog && hashToLog === customerFinded.hash) {
            Retour_1.default.log(`${customerFinded.account.firstname} ${customerFinded.account.name} is logged`);
            const newToken = uid2(26);
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
        else if (adminFinded &&
            adminHashToLog &&
            adminHashToLog === adminFinded.hash) {
            return res.status(200).json({
                message: "Admin logged in successfully",
                admin: {
                    id: adminFinded._id,
                    email: adminFinded.email,
                    account: adminFinded.account,
                },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QiwrREFBdUM7QUFDdkMscUZBQWtFO0FBRWxFLGtFQUEwQztBQUMxQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBRXBDLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxDQUFDLElBQUksQ0FDVCxRQUFRLEVBQ1IseUJBQW9CLEVBQ3BCLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ3BDLElBQUksQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixNQUFNLHFCQUFxQixHQUFHLE1BQU0sa0JBQVEsQ0FBQyxRQUFRLENBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUNmLENBQUMsUUFBUSxDQUFDO2dCQUNULEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7Z0JBQzNDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7Z0JBQzNDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRTthQUNyRSxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFD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