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
const Owner_1 = __importDefault(require("../models/Owner"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const twilio_1 = __importDefault(require("twilio"));
const router = express_1.default.Router();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
router.post("/resendCode", OwnerIsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = yield Owner_1.default.findById(req.body.owner);
        if (!owner) {
            return res.status(404).json({ error: "Owner not found" });
        }
        if (owner.isVerified) {
            return res.status(400).json({ error: "Owner phone already verified" });
        }
        const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        owner.verificationCode = newVerificationCode;
        owner.attempts = 0;
        yield owner.save();
        try {
            yield client.messages.create({
                body: `Votre nouveau code de vérification est : ${newVerificationCode}`,
                from: "Localappy",
                to: `+33${owner.account.phoneNumber}`,
            });
            return res
                .status(200)
                .json({ message: "New verification code sent successfully" });
        }
        catch (smsError) {
            console.error("Error sending SMS:", smsError);
            return res.status(500).json({
                error: "Failed to send verification code",
                details: smsError,
            });
        }
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to resend verification code", details: error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVzZW5kQ29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvUmVzZW5kQ29kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCw0REFBb0M7QUFDcEMsK0ZBQXVFO0FBQ3ZFLG9EQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBR2hDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7QUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBRTdDLE1BQU0sQ0FBQyxJQUFJLENBQ1QsYUFBYSxFQUNiLDhCQUFvQixFQUNwQixDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNwQyxJQUFJLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSw4QkFBOEIsRUFBRSxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUdELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDcEMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQ2hDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDYixLQUFLLENBQUMsZ0JBQWdCLEdBQUcsbUJBQW1CLENBQUM7UUFDN0MsS0FBSyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDbkIsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFHbkIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDM0IsSUFBSSxFQUFFLDRDQUE0QyxtQkFBbUIsRUFBRTtnQkFDdkUsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLEVBQUUsRUFBRSxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFO2FBQ3RDLENBQUMsQ0FBQztZQUVILE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUFDLE9BQU8sUUFBUSxFQUFFLENBQUM7WUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM5QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixLQUFLLEVBQUUsa0NBQWtDO2dCQUN6QyxPQUFPLEVBQUUsUUFBUTthQUNsQixDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLEdBQUc7YUFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2FBQ1gsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLG9DQUFvQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FDRixDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIn0=