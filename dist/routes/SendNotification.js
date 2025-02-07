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
const expo_server_sdk_1 = require("expo-server-sdk");
const Retour_1 = __importDefault(require("../library/Retour"));
const router = express_1.default.Router();
const expo = new expo_server_sdk_1.Expo();
router.post("/sendNotification", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, title, message } = req.body;
    if (!userId || !title || !message) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const customer = yield Customer_1.default.findById(userId);
        if (!customer || !customer.expoPushToken) {
            return res
                .status(404)
                .json({ message: "User or ExpoPushToken not found" });
        }
        const pushToken = customer.expoPushToken;
        if (!expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
            return res.status(400).json({ message: "Invalid Expo push token" });
        }
        const notificationMessage = {
            to: pushToken,
            sound: "default",
            title,
            body: message,
            data: { userId },
        };
        const receipt = yield expo.sendPushNotificationsAsync([
            notificationMessage,
        ]);
        Retour_1.default.info("Notification sent successfully");
        return res.status(200).json({ message: "Notification sent", receipt });
    }
    catch (error) {
        Retour_1.default.error("Failed to send notification");
        return res
            .status(500)
            .json({ message: "Failed to send notification", error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VuZE5vdGlmaWNhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvU2VuZE5vdGlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxrRUFBMEM7QUFDMUMscURBQXVDO0FBQ3ZDLCtEQUF1QztBQUV2QyxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hDLE1BQU0sSUFBSSxHQUFHLElBQUksc0JBQUksRUFBRSxDQUFDO0FBRXhCLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDckUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztJQUU1QyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELElBQUksQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sa0JBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QyxPQUFPLEdBQUc7aUJBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQztpQkFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDO1FBR3pDLElBQUksQ0FBQyxzQkFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFHRCxNQUFNLG1CQUFtQixHQUFHO1lBQzFCLEVBQUUsRUFBRSxTQUFTO1lBQ2IsS0FBSyxFQUFFLFNBQVM7WUFDaEIsS0FBSztZQUNMLElBQUksRUFBRSxPQUFPO1lBQ2IsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFO1NBQ2pCLENBQUM7UUFHRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQztZQUNwRCxtQkFBbUI7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUM5QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixnQkFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM3RCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILGtCQUFlLE1BQU0sQ0FBQyJ9