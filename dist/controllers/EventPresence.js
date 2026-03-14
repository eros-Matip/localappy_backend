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
const Event_1 = __importDefault(require("../models/Event"));
const EventPresence_1 = __importDefault(require("../models/EventPresence"));
const EventLivePhoto_1 = __importDefault(require("../models/EventLivePhoto"));
const Retour_1 = __importDefault(require("../library/Retour"));
const socket_1 = require("../utils/socket");
const PRESENCE_TIMEOUT_MINUTES = 20;
const isEventLiveNow = (event) => {
    const now = new Date();
    return (!!(event === null || event === void 0 ? void 0 : event.startingDate) &&
        !!(event === null || event === void 0 ? void 0 : event.endingDate) &&
        new Date(event.startingDate) <= now &&
        new Date(event.endingDate) >= now &&
        !(event === null || event === void 0 ? void 0 : event.isDraft));
};
const getActiveSinceDate = () => {
    return new Date(Date.now() - PRESENCE_TIMEOUT_MINUTES * 60 * 1000);
};
const getAuthenticatedCustomerId = (req) => {
    var _a, _b, _c;
    return ((_a = req.customer) === null || _a === void 0 ? void 0 : _a._id) || ((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.admin) === null || _c === void 0 ? void 0 : _c._id);
};
const joinPresence = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { eventId } = req.params;
        const customerId = getAuthenticatedCustomerId(req);
        const source = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.source) || "manual";
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        if (!customerId || !mongoose_1.default.isValidObjectId(String(customerId))) {
            return res.status(401).json({ message: "Utilisateur non autorisé" });
        }
        if (!["manual", "geo", "qr"].includes(source)) {
            return res.status(400).json({ message: "source invalide" });
        }
        const event = yield Event_1.default.findById(eventId).select("_id title startingDate endingDate isDraft");
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        if (!isEventLiveNow(event)) {
            return res.status(400).json({
                message: "Cet événement n'est pas en cours",
            });
        }
        const now = new Date();
        const presence = yield EventPresence_1.default.findOneAndUpdate({
            event: event._id,
            customer: customerId,
        }, {
            $set: {
                isActive: true,
                lastSeenAt: now,
                source,
            },
            $setOnInsert: {
                joinedAt: now,
            },
        }, {
            upsert: true,
            new: true,
        });
        const activeSince = getActiveSinceDate();
        const participantsCount = yield EventPresence_1.default.countDocuments({
            event: event._id,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        });
        const liveNsp = (0, socket_1.getLiveNsp)();
        liveNsp.to(`event:${event._id}`).emit("live:participantsUpdated", {
            eventId: String(event._id),
            participantsCount,
        });
        Retour_1.default.info(`Présence enregistrée sur l'événement ${event.title}`);
        return res.status(200).json({
            message: "Présence enregistrée",
            presence,
            participantsCount,
        });
    }
    catch (error) {
        console.error("Erreur joinPresence:", error);
        return res.status(500).json({
            message: "Erreur lors de l'enregistrement de présence",
            error,
        });
    }
});
const pingPresence = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const customerId = getAuthenticatedCustomerId(req);
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        if (!customerId || !mongoose_1.default.isValidObjectId(String(customerId))) {
            return res.status(401).json({ message: "Utilisateur non autorisé" });
        }
        const event = yield Event_1.default.findById(eventId).select("_id title startingDate endingDate isDraft");
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        const presence = yield EventPresence_1.default.findOneAndUpdate({
            event: event._id,
            customer: customerId,
            isActive: true,
        }, {
            $set: {
                lastSeenAt: new Date(),
            },
        }, { new: true });
        if (!presence) {
            return res.status(404).json({
                message: "Présence introuvable. Rejoignez d'abord l'événement.",
            });
        }
        const activeSince = getActiveSinceDate();
        const participantsCount = yield EventPresence_1.default.countDocuments({
            event: event._id,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        });
        return res.status(200).json({
            message: "Ping mis à jour",
            presence,
            participantsCount,
        });
    }
    catch (error) {
        console.error("Erreur pingPresence:", error);
        return res.status(500).json({
            message: "Erreur lors du ping de présence",
            error,
        });
    }
});
const leavePresence = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const customerId = getAuthenticatedCustomerId(req);
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        if (!customerId || !mongoose_1.default.isValidObjectId(String(customerId))) {
            return res.status(401).json({ message: "Utilisateur non autorisé" });
        }
        const event = yield Event_1.default.findById(eventId).select("_id title");
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        yield EventPresence_1.default.findOneAndUpdate({
            event: event._id,
            customer: customerId,
        }, {
            $set: {
                isActive: false,
            },
        });
        const activeSince = getActiveSinceDate();
        const participantsCount = yield EventPresence_1.default.countDocuments({
            event: event._id,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        });
        const liveNsp = (0, socket_1.getLiveNsp)();
        liveNsp.to(`event:${event._id}`).emit("live:participantsUpdated", {
            eventId: String(event._id),
            participantsCount,
        });
        return res.status(200).json({
            message: "Présence terminée",
            participantsCount,
        });
    }
    catch (error) {
        console.error("Erreur leavePresence:", error);
        return res.status(500).json({
            message: "Erreur lors de la sortie",
            error,
        });
    }
});
const getMyPresence = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const customerId = getAuthenticatedCustomerId(req);
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        if (!customerId || !mongoose_1.default.isValidObjectId(String(customerId))) {
            return res.status(401).json({ message: "Utilisateur non autorisé" });
        }
        const activeSince = getActiveSinceDate();
        const presence = yield EventPresence_1.default.findOne({
            event: eventId,
            customer: customerId,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        }).lean();
        return res.status(200).json({
            isPresent: !!presence,
            presence: presence || null,
        });
    }
    catch (error) {
        console.error("Erreur getMyPresence:", error);
        return res.status(500).json({
            message: "Erreur lors de la récupération de la présence",
            error,
        });
    }
});
const getLiveEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const customerId = getAuthenticatedCustomerId(req);
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        const event = yield Event_1.default.findById(eventId).select("_id title startingDate endingDate isDraft");
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        const activeSince = getActiveSinceDate();
        const isLive = isEventLiveNow(event);
        const participantsCount = yield EventPresence_1.default.countDocuments({
            event: event._id,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        });
        const livePhotosCount = yield EventLivePhoto_1.default.countDocuments({
            event: event._id,
            status: "approved",
        });
        const recentPhotos = yield EventLivePhoto_1.default.find({
            event: event._id,
            status: "approved",
        })
            .populate({
            path: "customer",
            model: "Customer",
            select: "account.firstname account.lastname",
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        let userIsPresent = false;
        if (customerId && mongoose_1.default.isValidObjectId(String(customerId))) {
            const presence = yield EventPresence_1.default.findOne({
                event: event._id,
                customer: customerId,
                isActive: true,
                lastSeenAt: { $gte: activeSince },
            }).lean();
            userIsPresent = !!presence;
        }
        return res.status(200).json({
            eventId: event._id,
            isLive,
            participantsCount,
            livePhotosCount,
            userIsPresent,
            recentPhotos,
        });
    }
    catch (error) {
        console.error("Erreur getLiveEvent:", error);
        return res.status(500).json({
            message: "Erreur récupération live event",
            error,
        });
    }
});
exports.default = {
    joinPresence,
    pingPresence,
    leavePresence,
    getMyPresence,
    getLiveEvent,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnRQcmVzZW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9FdmVudFByZXNlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esd0RBQWdDO0FBRWhDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsOEVBQXNEO0FBQ3RELCtEQUF1QztBQUN2Qyw0Q0FBNkM7QUFFN0MsTUFBTSx3QkFBd0IsR0FBRyxFQUFFLENBQUM7QUFFcEMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxLQUFVLEVBQUUsRUFBRTtJQUNwQyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBRXZCLE9BQU8sQ0FDTCxDQUFDLENBQUMsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsWUFBWSxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxVQUFVLENBQUE7UUFDbkIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUc7UUFDbkMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUc7UUFDakMsQ0FBQyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLENBQUEsQ0FDaEIsQ0FBQztBQUNKLENBQUMsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO0lBQzlCLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLHdCQUF3QixHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUM7QUFFRixNQUFNLDBCQUEwQixHQUFHLENBQUMsR0FBWSxFQUFFLEVBQUU7O0lBQ2xELE9BQU8sQ0FBQSxNQUFDLEdBQVcsQ0FBQyxRQUFRLDBDQUFFLEdBQUcsTUFBSSxNQUFBLE1BQUEsR0FB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