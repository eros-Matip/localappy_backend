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
        const ownerFinded = yield Owner_1.default.findOne({ token });
        if (!ownerFinded) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const resourceId = req.originalUrl.split("/").pop();
        const resourceType = req.originalUrl.split("/")[1];
        if (!resourceId) {
            return res.status(400).json({ error: "Resource ID not found in URL" });
        }
        if (resourceType === "event" && req.method === "POST") {
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
            if (!establishmentExists) {
                return res.status(403).json({
                    error: "Forbidden, owner does not have access to this event",
                });
            }
        }
        if (resourceType === "establishment") {
            const establishmentExists = ownerFinded.establishments.some((establishment) => Object(establishment)._id.equals(resourceId));
            if (!establishmentExists) {
                return res.status(403).json({
                    error: "Forbidden, owner does not have access to this establishment",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXJJc0F1dGhlbnRpY2F0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWlkZGxld2FyZXMvT3duZXJJc0F1dGhlbnRpY2F0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0REFBb0M7QUFDcEMsNERBQW9DO0FBRXBDLDRFQUFvRDtBQUVwRCxNQUFNLG9CQUFvQixHQUFHLENBQzNCLEdBQVksRUFDWixHQUFhLEVBQ2IsSUFBa0IsRUFDbEIsRUFBRTtJQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQy9CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxJQUFJLENBQUM7UUFFSCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRy9ELE1BQU0sV0FBVyxHQUFHLE1BQU0sZUFBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBR0QsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEQsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLFVB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