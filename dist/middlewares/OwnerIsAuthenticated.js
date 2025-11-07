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
const Owner_1 = __importDefault(require("../models/Owner"));
const Event_1 = __importDefault(require("../models/Event"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const OwnerIsAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: "Unauthorized, no token provided" });
    }
    try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const ownerFinded = yield Owner_1.default.findOne({ token: token });
        if (!ownerFinded) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const resourceId = req.originalUrl.split("/").pop();
        const resourceType = req.originalUrl.split("/")[1];
        const ressourceCall = req.originalUrl.split("/")[2];
        if (!resourceId) {
            return res.status(400).json({ error: "Resource ID not found in URL" });
        }
        console.log("resourceType", resourceType);
        if (resourceType === "event" && req.method === "POST") {
            req.body.owner = ownerFinded;
            return next();
        }
        if (resourceType === "customer" && req.method === "POST") {
            req.body.owner = ownerFinded;
            return next();
        }
        if (resourceType === "event" && req.method !== "POST") {
            const eventFinded = yield Event_1.default.findById(resourceId).populate("organizer.establishment");
            if (!eventFinded) {
                return res.status(404).json({ error: "Event not found" });
            }
            const establishmentFinded = yield Establishment_1.default.findOne({
                events: eventFinded._id,
            });
            const establishmentExists = ownerFinded.establishments.some((establishment) => Object(establishment)._id.equals(Object(establishmentFinded)._id));
            if (!establishmentExists && ressourceCall !== "create") {
                return res.status(403).json({
                    error: "Forbidden, owner does not have access to this event",
                });
            }
        }
        req.body.owner = ownerFinded;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXJJc0F1dGhlbnRpY2F0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWlkZGxld2FyZXMvT3duZXJJc0F1dGhlbnRpY2F0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0REFBb0M7QUFDcEMsNERBQW9DO0FBRXBDLDRFQUFvRDtBQUVwRCxNQUFNLG9CQUFvQixHQUFHLENBQzNCLEdBQVksRUFDWixHQUFhLEVBQ2IsSUFBa0IsRUFDbEIsRUFBRTtJQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQy9CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxJQUFJLENBQUM7UUFFSCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRy9ELE1BQU0sV0FBVyxHQUFHLE1BQU0sZUFBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUdELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1B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