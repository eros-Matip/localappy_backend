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
const cloudinary_1 = __importDefault(require("cloudinary"));
const Event_1 = __importDefault(require("../models/Event"));
const EventPresence_1 = __importDefault(require("../models/EventPresence"));
const EventLivePhoto_1 = __importDefault(require("../models/EventLivePhoto"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
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
const getAuthenticatedOwnerId = (req) => {
    var _a, _b, _c;
    return ((_a = req.owner) === null || _a === void 0 ? void 0 : _a._id) || ((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.owner) === null || _c === void 0 ? void 0 : _c._id);
};
const uploadLivePhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { eventId } = req.params;
        const customerId = getAuthenticatedCustomerId(req);
        const caption = ((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.caption) === null || _b === void 0 ? void 0 : _b.trim()) || "";
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
        if (!isEventLiveNow(event)) {
            return res.status(400).json({
                message: "Impossible d'ajouter une photo sur un événement non en cours",
            });
        }
        const activeSince = getActiveSinceDate();
        const presence = yield EventPresence_1.default.findOne({
            event: event._id,
            customer: customerId,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        });
        if (!presence) {
            return res.status(403).json({
                message: "Vous devez être présent sur l'événement pour publier une photo",
            });
        }
        const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
        const allFiles = Object.values(filesObject).flat();
        if (!allFiles.length) {
            return res.status(400).json({
                message: "Aucune image n'a été envoyée",
            });
        }
        const uploadedPhotos = [];
        for (const file of allFiles) {
            const result = yield cloudinary_1.default.v2.uploader.upload(file.path, {
                folder: `events/live/${event._id}`,
            });
            const photo = yield EventLivePhoto_1.default.create({
                event: event._id,
                customer: customerId,
                imageUrl: result.secure_url,
                caption,
                status: "approved",
            });
            uploadedPhotos.push(photo);
        }
        const photosCount = yield EventLivePhoto_1.default.countDocuments({
            event: event._id,
            status: "approved",
        });
        const liveNsp = (0, socket_1.getLiveNsp)();
        liveNsp.to(`event:${event._id}`).emit("live:photosUpdated", {
            eventId: String(event._id),
            photosCount,
        });
        Retour_1.default.info(`Photo(s) live ajoutée(s) sur l'événement ${event.title}`);
        return res.status(201).json({
            message: "Photo(s) live ajoutée(s)",
            photos: uploadedPhotos,
            photosCount,
        });
    }
    catch (error) {
        console.error("Erreur uploadLivePhoto:", error);
        return res.status(500).json({
            message: "Erreur lors de l'upload des photos live",
            error,
        });
    }
});
const getLivePhotos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        const event = yield Event_1.default.findById(eventId).select("_id title");
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        const [photos, total] = yield Promise.all([
            EventLivePhoto_1.default.find({
                event: event._id,
                status: "approved",
            })
                .populate({
                path: "customer",
                model: "Customer",
                select: "account.firstname account.lastname",
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EventLivePhoto_1.default.countDocuments({
                event: event._id,
                status: "approved",
            }),
        ]);
        return res.status(200).json({
            items: photos,
            total,
            page,
            limit,
        });
    }
    catch (error) {
        console.error("Erreur getLivePhotos:", error);
        return res.status(500).json({
            message: "Erreur lors de la récupération des photos live",
            error,
        });
    }
});
const deleteLivePhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId, photoId } = req.params;
        const ownerId = getAuthenticatedOwnerId(req);
        if (!ownerId || !mongoose_1.default.isValidObjectId(String(ownerId))) {
            return res.status(401).json({ message: "Owner non authentifié" });
        }
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        if (!mongoose_1.default.isValidObjectId(photoId)) {
            return res.status(400).json({ message: "photoId invalide" });
        }
        const establishmentFinded = yield Establishment_1.default.findOne({
            events: eventId,
        });
        if (!establishmentFinded) {
            return res.status(404).json({ message: "Établissement introuvable" });
        }
        const ownerIds = Array.isArray(establishmentFinded.owner)
            ? establishmentFinded.owner.map((id) => String(id))
            : [];
        if (!ownerIds.includes(String(ownerId))) {
            return res.status(401).json({ message: "Owner non autorisé" });
        }
        const photo = yield EventLivePhoto_1.default.findOne({
            _id: photoId,
            event: eventId,
        });
        if (!photo) {
            return res.status(404).json({ message: "Photo introuvable" });
        }
        yield EventLivePhoto_1.default.findByIdAndDelete(photo._id);
        const photosCount = yield EventLivePhoto_1.default.countDocuments({
            event: eventId,
            status: "approved",
        });
        const liveNsp = (0, socket_1.getLiveNsp)();
        liveNsp.to(`event:${eventId}`).emit("live:photosUpdated", {
            eventId: String(eventId),
            photosCount,
        });
        return res.status(200).json({
            message: "Photo supprimée avec succès",
            photosCount,
        });
    }
    catch (error) {
        console.error("Erreur deleteLivePhoto:", error);
        return res.status(500).json({
            message: "Erreur lors de la suppression de la photo",
            error,
        });
    }
});
const moderateLivePhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId, photoId } = req.params;
        const { status } = req.body;
        const ownerId = getAuthenticatedOwnerId(req);
        if (!ownerId || !mongoose_1.default.isValidObjectId(String(ownerId))) {
            return res.status(401).json({
                message: "Owner non authentifié",
            });
        }
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        if (!mongoose_1.default.isValidObjectId(photoId)) {
            return res.status(400).json({ message: "photoId invalide" });
        }
        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "Status invalide",
            });
        }
        const establishmentFinded = yield Establishment_1.default.findOne({
            events: eventId,
        });
        if (!establishmentFinded) {
            return res.status(404).json({ message: "Établissement introuvable" });
        }
        const ownerIds = Array.isArray(establishmentFinded.owner)
            ? establishmentFinded.owner.map((id) => String(id))
            : [];
        if (!ownerIds.includes(String(ownerId))) {
            return res.status(401).json({ message: "Owner non autorisé" });
        }
        const photo = yield EventLivePhoto_1.default.findOneAndUpdate({
            _id: photoId,
            event: eventId,
        }, {
            $set: { status },
        }, { new: true });
        if (!photo) {
            return res.status(404).json({ message: "Photo introuvable" });
        }
        const photosCount = yield EventLivePhoto_1.default.countDocuments({
            event: eventId,
            status: "approved",
        });
        const liveNsp = (0, socket_1.getLiveNsp)();
        liveNsp.to(`event:${eventId}`).emit("live:photosUpdated", {
            eventId: String(eventId),
            photosCount,
        });
        return res.status(200).json({
            message: "Photo modérée avec succès",
            photo,
            photosCount,
        });
    }
    catch (error) {
        console.error("Erreur moderateLivePhoto:", error);
        return res.status(500).json({
            message: "Erreur lors de la modération de la photo",
            error,
        });
    }
});
exports.default = {
    uploadLivePhoto,
    getLivePhotos,
    deleteLivePhoto,
    moderateLivePhoto,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnRMaXZlUGhvdG8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnRMaXZlUGhvdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsNERBQW9DO0FBRXBDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsOEVBQXNEO0FBQ3RELCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFDcEQsNENBQTZDO0FBRTdDLE1BQU0sd0JBQXdCLEdBQUcsRUFBRSxDQUFDO0FBRXBDLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBVSxFQUFFLEVBQUU7SUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUV2QixPQUFPLENBQ0wsQ0FBQyxDQUFDLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFlBQVksQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsVUFBVSxDQUFBO1FBQ25CLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHO1FBQ25DLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHO1FBQ2pDLENBQUMsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxDQUFBLENBQ2hCLENBQUM7QUFDSixDQUFDLENBQUM7QUFFRixNQUFNLGtCQUFrQixHQUFHLEdBQUcsRUFBRTtJQUM5QixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyx3QkFBd0IsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDO0FBRUYsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLEdBQVksRUFBRSxFQUFFOztJQUNsRCxPQUFPLENBQUEsTUFBQyxHQUFXLENBQUMsUUFBUSww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