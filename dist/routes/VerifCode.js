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
const Customer_1 = __importDefault(require("../models/Customer"));
const twilio_1 = __importDefault(require("twilio"));
const router = express_1.default.Router();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = (0, twilio_1.default)(accountSid, authToken);
router.post("/verifCode", OwnerIsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { verificationCode } = req.body;
        const owner = yield Owner_1.default.findById(req.body.owner);
        const customerFinded = yield Customer_1.default.findById(owner === null || owner === void 0 ? void 0 : owner.customerAccount);
        if (!owner) {
            return res.status(404).json({ error: "Owner not found" });
        }
        if (!customerFinded) {
            return res.status(404).json({ error: "Customer not found" });
        }
        if (owner.isVerified) {
            return res.status(404).json({ error: "Owner phone already checked" });
        }
        if (owner.attempts >= 3) {
            const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            owner.verificationCode = newVerificationCode;
            owner.attempts = 0;
            yield owner.save();
            try {
                yield client.messages.create({
                    body: `Votre nouveau code de vérification est : ${newVerificationCode}`,
                    from: "Localappy",
                    to: `+${owner.account.phoneNumber}`,
                });
                return res.status(200).json({
                    message: "New verification code sent after 3 failed attempts",
                });
            }
            catch (smsError) {
                console.error("Error sending SMS:", smsError);
                return res.status(500).json({
                    error: "Failed to send new verification code",
                    details: smsError,
                });
            }
        }
        if (owner.verificationCode === verificationCode) {
            customerFinded.ownerAccount = owner._id;
            yield customerFinded.save();
            owner.isVerified = true;
            owner.verificationCode = null;
            owner.attempts = 0;
            yield owner.save();
            return res
                .status(200)
                .json({ message: "Phone number verified successfully" });
        }
        else {
            owner.attempts += 1;
            yield owner.save();
            return res.status(400).json({
                error: "Invalid verification code",
                attempts: owner.attempts,
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to verify owner",
            details: error || error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmVyaWZDb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9WZXJpZkNvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBcUQ7QUFDckQsNERBQW9DO0FBQ3BDLCtGQUF1RTtBQUN2RSxrRUFBMEM7QUFFMUMsb0RBQTRCO0FBRTVCLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFHaEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztBQUNsRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ2hELE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQztBQUMxRCxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBRTdDLE1BQU0sQ0FBQyxJQUFJLENBQ1QsWUFBWSxFQUNaLDhCQUFvQixFQUNwQixDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNwQyxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBR3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sZUFBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE1BQU0sY0FBYyxHQUFHLE1BQU0sa0JBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRXZFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUs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