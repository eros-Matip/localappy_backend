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
const router = express_1.default.Router();
router.post("/login", IsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.body.admin) {
            const customerFindedByToken = yield Customer_1.default.findById(req.body.admin).populate({ path: "themesFavorites", model: "Theme" });
            return res.status(200).json({
                message: "Logged in with token",
                customer: customerFindedByToken,
            });
        }
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }
        const customerFinded = yield Customer_1.default.findOne({ email }).populate([
            {
                path: "themesFavorites",
                model: "Theme",
            },
            {
                path: "eventsFavorites",
                model: "Event",
            },
        ]);
        if (!customerFinded) {
            Retour_1.default.error("Account was not found");
            return res.status(401).json({ message: "Account was not found" });
        }
        const hashToLog = SHA256(password + customerFinded.salt).toString(encBase64);
        if (hashToLog === customerFinded.hash) {
            Retour_1.default.log(`${customerFinded.account.firstname} ${customerFinded.account.name} is logged`);
            const newToken = uid2(29);
            customerFinded.token = newToken;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xvZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXFEO0FBQ3JELGtFQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsK0RBQXVDO0FBQ3ZDLHFGQUFrRTtBQUVsRSxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBR2hDLE1BQU0sQ0FBQyxJQUFJLENBQ1QsUUFBUSxFQUNSLHlCQUFvQixFQUNwQixDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNwQyxJQUFJLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkIsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLGtCQUFRLENBQUMsUUFBUSxDQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FDZixDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUV4RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsc0JBQXNCO2dCQUMvQixRQUFRLEVBQUUscUJBQXFCO2FBQ2hDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFHRCxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFckMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUdELE1BQU0sY0FBYyxHQUFHLE1BQU0sa0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUNoRTtnQkFDRSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixLQUFLLEVBQUUsT0FBTzthQUNmO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsS0FBSyxFQUFFLE9BQU87YUFDZjtTQUNGLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQixnQkFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3RDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFHRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQy9ELFNBQVMsQ0FDVixDQUFDO1FBRUYsSUFBSSxTQUFTLEtBQUssY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RDLGdCQUFNLENBQUMsR0FBRyxDQUNSLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFlBQVksQ0FDL0UsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFXLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsQyxjQUFjLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztZQUdoQyxNQUFNLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU1QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsbUNBQW1DO2dCQUM1QyxRQUFRLEVBQUUsY0FBYzthQUN6QixDQUFDLENBQUM7UUFDTCxDQUFDO2FBQU0sQ0FBQztZQUNOLGdCQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDakMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDakQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNsRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQ0YsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9