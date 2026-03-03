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
        if (!req.body) {
            req.body = {};
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXJJc0F1dGhlbnRpY2F0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWlkZGxld2FyZXMvT3duZXJJc0F1dGhlbnRpY2F0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsNERBQW9DO0FBQ3BDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFFcEQsTUFBTSxvQkFBb0IsR0FBRyxDQUMzQixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztJQUN2QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDVixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGlDQUFpQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakQsTUFBTSxXQUFXLEdBQUcsTUFBTSxlQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFQSxHQUFXLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQztRQUNoQyxHQUFXLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUM7UUFHdkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNkLEdBQUcsQ0FBQyxJQUFJ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