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
const twilio_1 = __importDefault(require("twilio"));
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
const normalizeFrenchPhoneNumber = (phoneNumber) => {
    if (!phoneNumber)
        return null;
    const cleaned = phoneNumber.toString().replace(/\s/g, "");
    if (cleaned.startsWith("+")) {
        return cleaned;
    }
    if (cleaned.startsWith("0")) {
        return `+33${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith("33")) {
        return `+${cleaned}`;
    }
    if (cleaned.length === 9) {
        return `+33${cleaned}`;
    }
    return null;
};
const buildOwnerMessage = ({ type, firstname, establishmentName, }) => {
    const safeFirstname = firstname === null || firstname === void 0 ? void 0 : firstname.trim();
    const safeEstablishmentName = establishmentName === null || establishmentName === void 0 ? void 0 : establishmentName.trim();
    switch (type) {
        case "creator_approved": {
            if (safeFirstname && safeEstablishmentName) {
                return `Bonjour ${safeFirstname}, bonne nouvelle ! Votre établissement ${safeEstablishmentName} a été approuvé sur Localappy. Vous pouvez dès maintenant créer votre premier événement depuis l'application.`;
            }
            if (safeFirstname) {
                return `Bonjour ${safeFirstname}, bonne nouvelle ! Votre compte créateur Localappy et votre établissement ont été approuvés. Vous pouvez dès maintenant créer votre premier événement depuis l'application.`;
            }
            return `Bonne nouvelle ! Votre compte créateur Localappy et votre établissement ont été approuvés. Vous pouvez dès maintenant créer votre premier événement depuis l'application.`;
        }
        default:
            throw new Error("Unsupported owner message type");
    }
};
router.post("/sendOwnerMessage", AdminIsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { ownerId, establishmentId, type } = req.body;
        if (!ownerId) {
            return res.status(400).json({
                success: false,
                message: "ownerId is required",
            });
        }
        if (!type) {
            return res.status(400).json({
                success: false,
                message: "type is required",
            });
        }
        if (type !== "creator_approved") {
            return res.status(400).json({
                success: false,
                message: "Unsupported message type",
            });
        }
        const owner = yield Owner_1.default.findById(ownerId).populate("establishments");
        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner not found",
            });
        }
        const phoneNumber = normalizeFrenchPhoneNumber((_a = owner.account) === null || _a === void 0 ? void 0 : _a.phoneNumber);
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Invalid owner phone number",
            });
        }
        let establishmentName;
        const establishments = owner.establishments;
        if (establishmentId) {
            const establishment = establishments.find((item) => { var _a; return ((_a = item === null || item === void 0 ? void 0 : item._id) === null || _a === void 0 ? void 0 : _a.toString()) === establishmentId; });
            if (!establishment) {
                return res.status(404).json({
                    success: false,
                    message: "Establishment not found for this owner",
                });
            }
            establishmentName = establishment.name;
        }
        else if (establishments.length > 0) {
            establishmentName = (_b = establishments[0]) === null || _b === void 0 ? void 0 : _b.name;
        }
        const body = buildOwnerMessage({
            type,
            firstname: (_c = owner.account) === null || _c === void 0 ? void 0 : _c.firstname,
            establishmentName,
        });
        yield client.messages.create({
            body,
            from: "Localappy",
            to: phoneNumber,
        });
        return res.status(200).json({
            success: true,
            message: "Owner message sent successfully",
        });
    }
    catch (error) {
        console.error("Error sending owner message:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send owner message",
            error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VuZE1lc3NhZ2VPd25lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvU2VuZE1lc3NhZ2VPd25lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCw0REFBb0M7QUFFcEMsb0RBQTRCO0FBQzVCLCtGQUF1RTtBQUV2RSxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBR2hDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7QUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBSTdDLE1BQU0sMEJBQTBCLEdBQUcsQ0FDakMsV0FBNkIsRUFDZCxFQUFFO0lBQ2pCLElBQUksQ0FBQyxXQUFXO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFFOUIsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFMUQsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDNUIsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzVCLE9BQU8sTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFL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