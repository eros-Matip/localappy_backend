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
const mongoose_1 = __importDefault(require("mongoose"));
const Owner_1 = __importDefault(require("../models/Owner"));
const Event_1 = __importDefault(require("../models/Event"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const OwnerIsAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: "Unauthorized, no token provided" });
    }
    try {
        const token = auth.replace("Bearer ", "").trim();
        const ownerFinded = yield Owner_1.default.findOne({ token });
        if (!ownerFinded) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        req.owner = ownerFinded;
        req.ownerId = ownerFinded._id;
        req.body.owner = ownerFinded;
        const originalUrl = req.originalUrl || "";
        const parts = originalUrl.split("?")[0].split("/").filter(Boolean);
        const resourceType = parts[0];
        const ressourceCall = parts[1];
        const resourceId = parts[parts.length - 1];
        const hasObjectIdInUrl = mongoose_1.default.isValidObjectId(resourceId);
        if (resourceType === "event" && req.method === "POST") {
            return next();
        }
        if (resourceType === "event" && req.method !== "POST" && hasObjectIdInUrl) {
            const eventFinded = yield Event_1.default.findById(resourceId).populate("organizer.establishment");
            if (!eventFinded) {
                return res.status(404).json({ error: "Event not found" });
            }
            const establishmentFinded = yield Establishment_1.default.findOne({
                events: eventFinded._id,
            });
            if (!establishmentFinded) {
                return res.status(404).json({ error: "Establishment not found" });
            }
            const ownerEstablishments = Array.isArray(ownerFinded.establishments)
                ? ownerFinded.establishments
                : [];
            const establishmentExists = ownerEstablishments.some((est) => {
                const estId = (est && (est._id || est));
                return (mongoose_1.default.isValidObjectId(estId) &&
                    new mongoose_1.default.Types.ObjectId(estId).equals(new mongoose_1.default.Types.ObjectId(establishmentFinded._id)));
            });
            if (!establishmentExists && ressourceCall !== "create") {
                return res.status(403).json({
                    error: "Forbidden, owner does not have access to this event",
                });
            }
            return next();
        }
        const isEstablishmentSensitiveCall = resourceType === "establishment" &&
            (req.method === "PUT" ||
                (req.method === "POST" &&
                    ["upload-legal-doc", "request-activation", "update"].includes(ressourceCall || "")));
        if (isEstablishmentSensitiveCall) {
            if (!hasObjectIdInUrl) {
                return next();
            }
            const establishment = yield Establishment_1.default.findById(resourceId);
            if (!establishment) {
                return res.status(404).json({ error: "Establishment not found" });
            }
            const ownersArr = Array.isArray(establishment.owner)
                ? establishment.owner
                : establishment.owner
                    ? [establishment.owner]
                    : [];
            const isOwner = ownersArr.some((id) => String(id) === String(ownerFinded._id));
            if (!isOwner) {
                return res.status(403).json({
                    error: "Forbidden, owner does not have access to this establishment",
                });
            }
            return next();
        }
        return next();
    }
    catch (error) {
        console.error("Error during owner authentication:", error);
        return res
            .status(500)
            .json({ error: "Server error during authentication" });
    }
});
exports.default = OwnerIsAuthenticated;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXJJc0F1dGhlbnRpY2F0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWlkZGxld2FyZXMvT3duZXJJc0F1dGhlbnRpY2F0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsNERBQW9DO0FBQ3BDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFFcEQsTUFBTSxvQkFBb0IsR0FBRyxDQUMzQixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztJQUN2QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDVixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGlDQUFpQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakQsTUFBTSxXQUFXLEdBQUcsTUFBTSxlQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFQSxHQUFXLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQztRQUNoQyxHQUFXLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUM7UUFFdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBRTdCLE1BQU0sV0FB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