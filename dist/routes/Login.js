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
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const Retour_1 = __importDefault(require("../library/Retour"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const Owner_1 = __importDefault(require("../models/Owner"));
const router = express_1.default.Router();
router.post("/login", IsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.body.admin) {
            const customerFindedByToken = yield Customer_1.default.findById(req.body.admin).populate([
                { path: "themesFavorites", model: "Theme" },
                { path: "eventsFavorites", model: "Event" },
                { path: "ownerAccount", model: "Owner" },
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
            { path: "ownerAccount", model: "Owner" },
        ]);
        if (!customerFinded) {
            Retour_1.default.error("Account was not found");
            return res.status(401).json({ message: "Account was not found" });
        }
        const ownerFinded = yield Owner_1.default.findById(customerFinded.ownerAccount);
        const hashToLog = SHA256(password + customerFinded.salt).toString(encBase64);
        if (hashToLog === customerFinded.hash) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELGtFQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsK0RBQXVDO0FBQ3ZDLHFGQUFrRTtBQUNsRSw0REFBb0M7QUFFcEMsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUdoQyxNQUFNLENBQUMsSUFBSSxDQUNULFFBQVEsRUFDUix5QkFBb0IsRUFDcEIsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDcEMsSUFBSSxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxrQkFBUSxDQUFDLFFBQVEsQ0FDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQ2YsQ0FBQyxRQUFRLENBQUM7Z0JBQ1QsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtnQkFDM0MsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtnQkFDM0MsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7YUFDekMsQ0FBQyxDQUFDO1lBR0gsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQzNCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVB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