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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELGtFQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsK0RBQXVDO0FBQ3ZDLHFGQUFrRTtBQUNsRSw0REFBb0M7QUFFcEMsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUdoQyxNQUFNLENBQUMsSUFBSSxDQUNULFFBQVEsRUFDUix5QkFBb0IsRUFDcEIsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDcEMsSUFBSSxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxrQkFBUSxDQUFDLFFBQVEsQ0FDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQ2YsQ0FBQyxRQUFRLENBQUM7Z0JBQ1QsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtnQkFDM0MsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtnQkFDM0MsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFO2FBQ3JFLENBQUMsQ0FBQztZQUdILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVB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