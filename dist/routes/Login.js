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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELGtFQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsK0RBQXVDO0FBQ3ZDLHFGQUFrRTtBQUNsRSw0REFBb0M7QUFFcEMsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUdoQyxNQUFNLENBQUMsSUFBSSxDQUNULFFBQVEsRUFDUix5QkFBb0IsRUFDcEIsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDcEMsSUFBSSxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxrQkFBUSxDQUFDLFFBQVEsQ0FDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQ2YsQ0FBQyxRQUFRLENBQUM7Z0JBQ1QsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtnQkFDM0MsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtnQkFDM0MsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFO2FBQ3JFLENBQUMsQ0FBQztZQUdILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVB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