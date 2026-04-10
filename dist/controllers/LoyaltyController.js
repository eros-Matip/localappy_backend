"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importStar(require("mongoose"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const UserLoyaltyCard_1 = __importDefault(require("../models/UserLoyaltyCard"));
const Retour_1 = __importDefault(require("../library/Retour"));
const isValidObjectId = (value) => mongoose_1.default.isValidObjectId(value);
const normalizeObjectId = (value) => {
    if (!isValidObjectId(value))
        return null;
    return new mongoose_1.Types.ObjectId(value);
};
const isProgramCurrentlyAvailable = (program) => {
    const now = new Date();
    if (!program.isActive)
        return false;
    if (program.startsAt && new Date(program.startsAt) > now)
        return false;
    if (program.endsAt && new Date(program.endsAt) < now)
        return false;
    return true;
};
const findLoyaltyProgramInEstablishment = (establishment, programId) => {
    const programs = Array.isArray(establishment === null || establishment === void 0 ? void 0 : establishment.loyaltyPrograms)
        ? establishment.loyaltyPrograms
        : [];
    if (!programs.length)
        return null;
    if (programId) {
        const found = programs.find((p) => String(p._id) === String(programId));
        return found || null;
    }
    const activeProgram = programs.find((p) => isProgramCurrentlyAvailable(p));
    return activeProgram || null;
};
const ownerBelongsToEstablishment = (establishment, requesterOwnerId) => {
    if (!requesterOwnerId)
        return false;
    const owners = Array.isArray(establishment === null || establishment === void 0 ? void 0 : establishment.owner) ? establishment.owner : [];
    return owners.some((id) => String(id) === String(requesterOwnerId));
};
const staffBelongsToEstablishment = (establishment, requesterCustomerId) => {
    if (!requesterCustomerId)
        return false;
    const staff = Array.isArray(establishment === null || establishment === void 0 ? void 0 : establishment.staff) ? establishment.staff : [];
    return staff.some((id) => String(id) === String(requesterCustomerId));
};
const canManageLoyaltyForEstablishment = (establishment, requesterOwnerId, requesterCustomerId) => {
    return (ownerBelongsToEstablishment(establishment, requesterOwnerId) ||
        staffBelongsToEstablishment(establishment, requesterCustomerId));
};
const getMyLoyaltyCards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const customerId = ((_a = req === null || req === void 0 ? void 0 : req.customer) === null || _a === void 0 ? void 0 : _a._id) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req.body) === null || _c === void 0 ? void 0 : _c.customerId);
        if (!customerId || !isValidObjectId(customerId)) {
            return res.status(401).json({ message: "Customer auth required" });
        }
        const cards = yield UserLoyaltyCard_1.default.find({
            userId: customerId,
        })
            .populate("establishmentId", "name logo photos address loyaltyPrograms")
            .sort({ updatedAt: -1 });
        return res.status(200).json(cards);
    }
    catch (error) {
        Retour_1.default.error(`getMyLoyaltyCards error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to get loyalty cards" });
    }
});
const getMyLoyaltyCardByEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { establishmentId } = req.params;
        const { programId, autoCreate = "true" } = req.query;
        const customerId = ((_a = req === null || req === void 0 ? void 0 : req.customer) === null || _a === void 0 ? void 0 : _a._id) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req.body) === null || _c === void 0 ? void 0 : _c.customerId);
        if (!customerId || !isValidObjectId(customerId)) {
            return res.status(401).json({ message: "Customer auth required" });
        }
        if (!isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId).lean();
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const program = findLoyaltyProgramInEstablishment(establishment, typeof programId === "string" ? programId : undefined);
        if (!program) {
            return res.status(404).json({ message: "No loyalty program found" });
        }
        if (!isProgramCurrentlyAvailable(program)) {
            return res.status(400).json({ message: "Loyalty program is not active" });
        }
        let card = yield UserLoyaltyCard_1.default.findOne({
            userId: customerId,
            establishmentId,
            loyaltyProgramId: program._id,
        });
        if (!card && autoCreate === "true") {
            card = yield UserLoyaltyCard_1.default.create({
                userId: customerId,
                establishmentId,
                loyaltyProgramId: program._id,
                currentStamps: 0,
                status: "active",
                completedCardsCount: 0,
                lastScannedAt: null,
                lastRewardRedeemedAt: null,
            });
        }
        return res.status(200).json({
            establishment: {
                _id: establishment._id,
                name: establishment.name,
                logo: establishment.logo,
                photos: establishment.photos,
                address: establishment.address,
            },
            program,
            card,
        });
    }
    catch (error) {
        Retour_1.default.error(`getMyLoyaltyCardByEstablishment error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to get loyalty card" });
    }
});
const createLoyaltyProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { establishmentId, title, stampGoal = 10, rewardDescription, startsAt = null, endsAt = null, } = req.body;
        const requesterOwnerId = ((_a = req === null || req === void 0 ? void 0 : req.owner) === null || _a === void 0 ? void 0 : _a._id) ||
            (req === null || req === void 0 ? void 0 : req.ownerId) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req.body) === null || _c === void 0 ? void 0 : _c.ownerId);
        if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
            return res.status(401).json({ message: "Owner auth required" });
        }
        if (!isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        if (!rewardDescription || !String(rewardDescription).trim()) {
            return res.status(400).json({ message: "rewardDescription is required" });
        }
        const goal = Number(stampGoal);
        if (!Number.isFinite(goal) || goal < 1) {
            return res.status(400).json({ message: "stampGoal must be >= 1" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (!Array.isArray(establishment.loyaltyPrograms)) {
            establishment.loyaltyPrograms = [];
        }
        const existingPrograms = Array.isArray(establishment.loyaltyPrograms)
            ? establishment.loyaltyPrograms
            : [];
        const existingActiveProgram = existingPrograms.find((p) => p === null || p === void 0 ? void 0 : p.isActive);
        if (existingActiveProgram) {
            return res.status(409).json({
                message: "An active loyalty program already exists for this establishment",
                existingProgram: existingActiveProgram,
            });
        }
        const normalizedTitle = String(title || "Carte de fidélité")
            .trim()
            .toLowerCase();
        const normalizedReward = String(rewardDescription).trim().toLowerCase();
        const duplicateProgram = existingPrograms.find((p) => {
            return (String((p === null || p === void 0 ? void 0 : p.title) || "")
                .trim()
                .toLowerCase() === normalizedTitle &&
                Number((p === null || p === void 0 ? void 0 : p.stampGoal) || 0) === goal &&
                String((p === null || p === void 0 ? void 0 : p.rewardDescription) || "")
                    .trim()
                    .toLowerCase() === normalizedReward);
        });
        if (duplicateProgram) {
            return res.status(409).json({
                message: "A similar loyalty program already exists for this establishment",
                existingProgram: duplicateProgram,
            });
        }
        const nextProgram = {
            _id: new mongoose_1.Types.ObjectId(),
            title: (title === null || title === void 0 ? void 0 : title.trim()) || "Carte de fidélité",
            stampGoal: goal,
            rewardDescription: String(rewardDescription).trim(),
            isActive: true,
            startsAt,
            endsAt,
            createdBy: new mongoose_1.Types.ObjectId(requesterOwnerId),
        };
        establishment.loyaltyPrograms.push(nextProgram);
        yield establishment.save();
        return res.status(201).json({
            message: "Loyalty program created",
            program: nextProgram,
            loyaltyPrograms: establishment.loyaltyPrograms,
        });
    }
    catch (error) {
        Retour_1.default.error(`createLoyaltyProgram error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res
            .status(500)
            .json({ message: "Failed to create loyalty program" });
    }
});
const updateLoyaltyProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { programId } = req.params;
        const { establishmentId, title, stampGoal, rewardDescription, isActive, startsAt, endsAt, } = req.body;
        const requesterOwnerId = ((_a = req === null || req === void 0 ? void 0 : req.owner) === null || _a === void 0 ? void 0 : _a._id) ||
            (req === null || req === void 0 ? void 0 : req.ownerId) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req.body) === null || _c === void 0 ? void 0 : _c.ownerId);
        if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
            return res.status(401).json({ message: "Owner auth required" });
        }
        if (!isValidObjectId(establishmentId) || !isValidObjectId(programId)) {
            return res.status(400).json({ message: "Invalid ids" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const programs = Array.isArray(establishment.loyaltyPrograms)
            ? establishment.loyaltyPrograms
            : [];
        const program = programs.find((p) => String(p._id) === String(programId));
        if (!program) {
            return res.status(404).json({ message: "Loyalty program not found" });
        }
        if (title !== undefined) {
            program.title = String(title).trim();
        }
        if (rewardDescription !== undefined) {
            program.rewardDescription = String(rewardDescription).trim();
        }
        if (stampGoal !== undefined) {
            const goal = Number(stampGoal);
            if (!Number.isFinite(goal) || goal < 1) {
                return res.status(400).json({ message: "stampGoal must be >= 1" });
            }
            program.stampGoal = goal;
        }
        if (isActive !== undefined) {
            program.isActive = Boolean(isActive);
        }
        if (startsAt !== undefined) {
            program.startsAt = startsAt;
        }
        if (endsAt !== undefined) {
            program.endsAt = endsAt;
        }
        yield establishment.save();
        return res.status(200).json({
            message: "Loyalty program updated",
            program,
        });
    }
    catch (error) {
        Retour_1.default.error(`updateLoyaltyProgram error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res
            .status(500)
            .json({ message: "Failed to update loyalty program" });
    }
});
const deleteLoyaltyProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { programId } = req.params;
        const { establishmentId } = req.body;
        const requesterOwnerId = ((_a = req === null || req === void 0 ? void 0 : req.owner) === null || _a === void 0 ? void 0 : _a._id) ||
            (req === null || req === void 0 ? void 0 : req.ownerId) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req.body) === null || _c === void 0 ? void 0 : _c.ownerId);
        if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
            return res.status(401).json({ message: "Owner auth required" });
        }
        if (!isValidObjectId(establishmentId) || !isValidObjectId(programId)) {
            return res.status(400).json({ message: "Invalid ids" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const currentPrograms = Array.isArray(establishment.loyaltyPrograms)
            ? establishment.loyaltyPrograms
            : [];
        const exists = currentPrograms.some((p) => String(p._id) === String(programId));
        if (!exists) {
            return res.status(404).json({ message: "Loyalty program not found" });
        }
        establishment.loyaltyPrograms = currentPrograms.filter((p) => String(p._id) !== String(programId));
        yield establishment.save();
        return res.status(200).json({
            message: "Loyalty program deleted",
            loyaltyPrograms: establishment.loyaltyPrograms,
        });
    }
    catch (error) {
        Retour_1.default.error(`deleteLoyaltyProgram error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res
            .status(500)
            .json({ message: "Failed to delete loyalty program" });
    }
});
const getEstablishmentLoyaltyPrograms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { establishmentId } = req.params;
        if (!isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId)
            .select("name logo loyaltyPrograms")
            .lean();
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        return res.status(200).json({
            establishmentId: establishment._id,
            name: establishment.name,
            logo: establishment.logo,
            loyaltyPrograms: Array.isArray(establishment.loyaltyPrograms)
                ? establishment.loyaltyPrograms
                : [],
        });
    }
    catch (error) {
        Retour_1.default.error(`getEstablishmentLoyaltyPrograms error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to get loyalty programs" });
    }
});
const scanLoyaltyCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { establishmentId, customerId, programId } = req.body;
        const requesterOwnerId = ((_a = req === null || req === void 0 ? void 0 : req.owner) === null || _a === void 0 ? void 0 : _a._id) || (req === null || req === void 0 ? void 0 : req.ownerId) || null;
        const requesterCustomerId = ((_b = req === null || req === void 0 ? void 0 : req.customer) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req === null || req === void 0 ? void 0 : req.user) === null || _c === void 0 ? void 0 : _c._id) ||
            ((_d = req.body) === null || _d === void 0 ? void 0 : _d.staffId) ||
            null;
        if (!isValidObjectId(establishmentId) || !isValidObjectId(customerId)) {
            return res
                .status(400)
                .json({ message: "Invalid establishment/customer id" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!canManageLoyaltyForEstablishment(establishment, requesterOwnerId, requesterCustomerId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const program = findLoyaltyProgramInEstablishment(establishment, typeof programId === "string" ? programId : undefined);
        if (!program) {
            return res.status(404).json({ message: "No loyalty program found" });
        }
        if (!isProgramCurrentlyAvailable(program)) {
            return res.status(400).json({ message: "Loyalty program is not active" });
        }
        let card = yield UserLoyaltyCard_1.default.findOne({
            userId: customerId,
            establishmentId,
            loyaltyProgramId: program._id,
        });
        if (!card) {
            card = yield UserLoyaltyCard_1.default.create({
                userId: customerId,
                establishmentId,
                loyaltyProgramId: program._id,
                currentStamps: 0,
                status: "active",
                completedCardsCount: 0,
                lastScannedAt: null,
                lastRewardRedeemedAt: null,
            });
        }
        if (card.status === "reward_available") {
            return res.status(409).json({
                message: "Reward already available. Redeem it before adding a new stamp.",
                card,
                program,
            });
        }
        const goal = Number(program.stampGoal || 10);
        const nextStamps = Number(card.currentStamps || 0) + 1;
        card.currentStamps = nextStamps;
        card.lastScannedAt = new Date();
        if (nextStamps >= goal) {
            card.currentStamps = goal;
            card.status = "reward_available";
        }
        else {
            card.status = "active";
        }
        yield card.save();
        return res.status(200).json({
            message: card.status === "reward_available"
                ? "Card completed, reward available"
                : "Stamp added",
            card,
            program,
            rewardAvailable: card.status === "reward_available",
            remainingStamps: card.status === "reward_available"
                ? 0
                : Math.max(goal - Number(card.currentStamps || 0), 0),
        });
    }
    catch (error) {
        Retour_1.default.error(`scanLoyaltyCard error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to scan loyalty card" });
    }
});
const redeemLoyaltyReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { establishmentId, customerId, programId } = req.body;
        const requesterOwnerId = ((_a = req === null || req === void 0 ? void 0 : req.owner) === null || _a === void 0 ? void 0 : _a._id) || (req === null || req === void 0 ? void 0 : req.ownerId) || null;
        const requesterCustomerId = ((_b = req === null || req === void 0 ? void 0 : req.customer) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_c = req === null || req === void 0 ? void 0 : req.user) === null || _c === void 0 ? void 0 : _c._id) ||
            ((_d = req.body) === null || _d === void 0 ? void 0 : _d.staffId) ||
            null;
        if (!isValidObjectId(establishmentId) || !isValidObjectId(customerId)) {
            return res
                .status(400)
                .json({ message: "Invalid establishment/customer id" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!canManageLoyaltyForEstablishment(establishment, requesterOwnerId, requesterCustomerId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const program = findLoyaltyProgramInEstablishment(establishment, typeof programId === "string" ? programId : undefined);
        if (!program) {
            return res.status(404).json({ message: "No loyalty program found" });
        }
        const card = yield UserLoyaltyCard_1.default.findOne({
            userId: customerId,
            establishmentId,
            loyaltyProgramId: program._id,
        });
        if (!card) {
            return res.status(404).json({ message: "Loyalty card not found" });
        }
        if (card.status !== "reward_available") {
            return res.status(409).json({
                message: "No reward available for this card",
                card,
            });
        }
        card.currentStamps = 0;
        card.status = "active";
        card.completedCardsCount = Number(card.completedCardsCount || 0) + 1;
        card.lastRewardRedeemedAt = new Date();
        yield card.save();
        return res.status(200).json({
            message: "Reward redeemed, new cycle started",
            card,
            program,
        });
    }
    catch (error) {
        Retour_1.default.error(`redeemLoyaltyReward error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to redeem loyalty reward" });
    }
});
const getLoyaltyStatsByEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { establishmentId } = req.params;
        const { programId } = req.query;
        const requesterOwnerId = ((_a = req === null || req === void 0 ? void 0 : req.owner) === null || _a === void 0 ? void 0 : _a._id) ||
            (req === null || req === void 0 ? void 0 : req.ownerId) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            null;
        if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
            return res.status(401).json({ message: "Owner auth required" });
        }
        if (!isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId).lean();
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const program = findLoyaltyProgramInEstablishment(establishment, typeof programId === "string" ? programId : undefined);
        if (!program) {
            return res.status(404).json({ message: "No loyalty program found" });
        }
        const cards = yield UserLoyaltyCard_1.default.find({
            establishmentId,
            loyaltyProgramId: program._id,
        }).lean();
        const totalCards = cards.length;
        const activeCards = cards.filter((c) => c.status === "active").length;
        const rewardAvailableCards = cards.filter((c) => c.status === "reward_available").length;
        const totalCompletedCards = cards.reduce((sum, c) => sum + Number(c.completedCardsCount || 0), 0);
        const totalDistributedStamps = cards.reduce((sum, c) => sum +
            Number(c.currentStamps || 0) +
            Number(c.completedCardsCount || 0) * Number(program.stampGoal || 10), 0);
        return res.status(200).json({
            establishmentId,
            program,
            stats: {
                totalCards,
                activeCards,
                rewardAvailableCards,
                totalCompletedCards,
                totalDistributedStamps,
            },
        });
    }
    catch (error) {
        Retour_1.default.error(`getLoyaltyStatsByEstablishment error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to get loyalty stats" });
    }
});
exports.default = {
    getMyLoyaltyCards,
    getMyLoyaltyCardByEstablishment,
    createLoyaltyProgram,
    updateLoyaltyProgram,
    deleteLoyaltyProgram,
    getEstablishmentLoyaltyPrograms,
    scanLoyaltyCard,
    redeemLoyaltyReward,
    getLoyaltyStatsByEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG95YWx0eUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvTG95YWx0eUNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxREFBMkM7QUFDM0MsNEVBQW9EO0FBQ3BELGdGQUF3RDtBQUN4RCwrREFBdUM7QUFhdkMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxLQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRXhFLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxLQUFVLEVBQXlCLEVBQUU7SUFDOUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN6QyxPQUFPLElBQUksZ0JBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDO0FBRUYsTUFBTSwyQkFBMkIsR0FBRyxDQUFDLE9BQTZCLEVBQUUsRUFBRTtJQUNwRSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBRXZCLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3BDLElBQUksT0FBTyxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRztRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3ZFLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRztRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRW5FLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsTUFBTSxpQ0FBaUMsR0FBRyxDQUN4QyxhQUFrQixFQUNsQixTQUFrQixFQUNXLEVBQUU7SUFDL0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsZUFBZSxDQUFDO1FBQzVELENBQUMsQ0FBQyxhQUFhLENBQUMsZUFBZTtRQUMvQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBRVAsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFFbEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNkLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQ3pCLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FDaEQsQ0FBQztRQUNGLE9BQU8sS0FBSyxJQUFJLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQzdDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUMvQixDQUFDO0lBQ0YsT0FBTyxhQUFhLElBQUksSUFBSSxDQUFDO0FBQy9CLENBQUMsQ0FBQztBQUVGLE1BQU0sMkJBQTJCLEdBQUcsQ0FDbEMsYUFBa0IsRUFDbEIsZ0JBQTRELEVBQzVELEVBQUU7SUFDRixJQUFJLENBQUMsZ0JBQWdCO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFFcEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUM5RSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQztBQUVGLE1BQU0sMkJBQTJCLEdBQUcsQ0FDbEMsYUFBa0IsRUFDbEIsbUJBQStELEVBQy9ELEVBQUU7SUFDRixJQUFJLENBQUMsbUJBQW1CO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFFdkMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUM3RSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQztBQUVGLE1BQU0sZ0NBQWdDLEdBQUcsQ0FDdkMsYUFBa0IsRUFDbEIsZ0JBQWlELEVBQ2pELG1CQUFvRCxFQUNwRCxFQUFFO0lBQ0YsT0FBTyxDQUNMLDJCQUEyQixDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQztRQUM1RCwyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FDaEUsQ0FBQztBQUNKLENBQUMsQ0FBQztBQU1GLE1BQU0saUJBQWlCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQzlELElBQUksQ0FBQztRQUNILE1BQU0sVUFBVSxHQUNkLENBQUEsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsUUFBUSwwQ0FBRSxHQUFHO2FBQzNCLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsR0FBRyxDQUFBO2FBQ3ZCLE1BQUEsR0FBRyxDQUFDLElBQUksMENBQUUsVUFBVSxDQUFBLENBQUM7UUFFdkIsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2hELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLHlCQUFlLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLE1BQU0sRUFBRSxVQUFVO1NBQ25CLENBQUM7YUFDQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsMENBQTBDLENBQUM7YUFDdkUsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUzQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFPRixNQUFNLCtCQUErQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUM1RSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN2QyxNQUFNLEVBQUUsU0FBUyxFQUFFLFVBQVUsR0FBRyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXJELE1BQU0sVUFBVSxHQUNkLENBQUEsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsUUFBUSwwQ0FBRSxHQUFHO2FBQzNCLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsR0FBRyxDQUFBO2FBQ3ZCLE1BQUEsR0FBRyxDQUFDLElBQUksMENBQUUsVUFBVSxDQUFBLENBQUM7UUFFdkIsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2hELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDM0UsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxpQ0FBaUMsQ0FDL0MsYUFBYSxFQUNiLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQ3RELENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLE1BQU0seUJBQWUsQ0FBQyxPQUFPLENBQUM7WUFDdkMsTUFBTSxFQUFFLFVBQVU7WUFDbEIsZUFBZTtZQUNmLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFHO1NBQzlCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxJQUFJLElBQUksVUFBVSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ25DLElBQUksR0FBRyxNQUFNLHlCQUFlLENBQUMsTUFBTSxDQUFDO2dCQUNsQyxNQUFNLEVBQUUsVUFBVTtnQkFDbEIsZUFBZTtnQkFDZixnQkFBZ0IsRUFBRSxPQUFPLENBQUMsR0FBRztnQkFDN0IsYUFBYSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sRUFBRSxRQUFRO2dCQUNoQixtQkFBbUIsRUFBRSxDQUFDO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsb0JBQW9CLEVBQUUsSUFBSTthQUMzQixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixhQUFhLEVBQUU7Z0JBQ2IsR0FBRyxFQUFFLGFBQWEsQ0FBQyxHQUFHO2dCQUN0QixJQUFJLEVBQUcsYUFBcUIsQ0FBQyxJQUFJO2dCQUNqQyxJQUFJLEVBQUcsYUFBcUIsQ0FBQyxJQUFJO2dCQUNqQyxNQUFNLEVBQUcsYUFBcUIsQ0FBQyxNQUFNO2dCQUNyQyxPQUFPLEVBQUcsYUFBcUIsQ0FBQyxPQUFPO2FBQ3hDO1lBQ0QsT0FBTztZQUNQLElBQUk7U0FDTCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixnQkFBTSxDQUFDLEtBQUssQ0FDViwwQ0FBMEMsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUssRUFBRSxDQUNwRSxDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxDQUFDLENBQUM7SUFDekUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBU0YsTUFBTSxvQkFBb0IsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDakUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUNKLGVBQWUsRUFDZixLQUFLLEVBQ0wsU0FBUyxHQUFHLEVBQUUsRUFDZCxpQkFBaUIsRUFDakIsUUFBUSxHQUFHLElBQUksRUFDZixNQUFNLEdBQUcsSUFBSSxHQUNkLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUViLE1BQU0sZ0JBQWdCLEdBQ3BCLENBQUEsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsS0FBSywwQ0FBRSxHQUFHO2FBQ3ZCLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxPQUFPLENBQUE7YUFDckIsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsSUFBSSwwQ0FBRSxHQUFHLENBQUE7YUFDdkIsTUFBQSxHQUFHLENBQUMsSUFBSSwwQ0FBRSxPQUFPLENBQUEsQ0FBQztRQUVwQixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQzVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDNUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNsRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFFLGFBQXFCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUMxRCxhQUFxQixDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFDOUMsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FDbkMsYUFBcUIsQ0FBQyxlQUFlLENBQ3ZDO1lBQ0MsQ0FBQyxDQUFFLGFBQXFCLENBQUMsZUFBZTtZQUN4QyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBR1AsTUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQ2pELENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsUUFBUSxDQUN4QixDQUFDO1FBRUYsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzFCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFDTCxpRUFBaUU7Z0JBQ25FLGVBQWUsRUFBRSxxQkFBcUI7YUFDdkMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUdELE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxLQUFLLElBQUksbUJBQW1CLENBQUM7YUFDekQsSUFBSSxFQUFFO2FBQ04sV0FBVyxFQUFFLENBQUM7UUFFakIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV4RSxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFO1lBQ3hELE9BQU8sQ0FDTCxNQUFNLENBQUMsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsS0FBSyxLQUFJLEVBQUUsQ0FBQztpQkFDbkIsSUFBSSxFQUFFO2lCQUNOLFdBQVcsRUFBRSxLQUFLLGVBQWU7Z0JBQ3BDLE1BQU0sQ0FBQyxDQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxTQUFTLEtBQUksQ0FBQyxDQUFDLEtBQUssSUFBSTtnQkFDbEMsTUFBTSxDQUFDLENBQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLGlCQUFpQixLQUFJLEVBQUUsQ0FBQztxQkFDL0IsSUFBSSxFQUFFO3FCQUNOLFdBQVcsRUFBRSxLQUFLLGdCQUFnQixDQUN0QyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDckIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUNMLGlFQUFpRTtnQkFDbkUsZUFBZSxFQUFFLGdCQUFnQjthQUNsQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUc7WUFDbEIsR0FBRyxFQUFFLElBQUksZ0JBQUssQ0FBQyxRQUFRLEVBQUU7WUFDekIsS0FBSyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksRUFBRSxLQUFJLG1CQUFtQjtZQUMzQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUNuRCxRQUFRLEVBQUUsSUFBSTtZQUNkLFFBQVE7WUFDUixNQUFNO1lBQ04sU0FBUyxFQUFFLElBQUksZ0JBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7U0FDaEQsQ0FBQztRQUVELGFBQXFCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RCxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUUzQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSx5QkFBeUI7WUFDbEMsT0FBTyxFQUFFLFdBQVc7WUFDcEIsZUFBZSxFQUFHLGFBQXFCLENBQUMsZUFBZTtTQUN4RCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixnQkFBTSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdkUsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBTUYsTUFBTSxvQkFBb0IsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDakUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDakMsTUFBTSxFQUNKLGVBQWUsRUFDZixLQUFLLEVBQ0wsU0FBUyxFQUNULGlCQUFpQixFQUNqQixRQUFRLEVBQ1IsUUFBUSxFQUNSLE1BQU0sR0FDUCxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFYixNQUFNLGdCQUFnQixHQUNwQixDQUFBLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLEtBQUssMENBQUUsR0FBRzthQUN2QixHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsT0FBTyxDQUFBO2FBQ3JCLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsR0FBRyxDQUFBO2FBQ3ZCLE1BQUEsR0FBRyxDQUFDLElBQUksMENBQUUsT0FBTyxDQUFBLENBQUM7UUFFcEIsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUM1RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQ2xFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxhQUFxQixDQUFDLGVBQWUsQ0FBQztZQUNwRSxDQUFDLENBQUUsYUFBcUIsQ0FBQyxlQUFlO1lBQ3hDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFUCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUMzQixDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQ2hELENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkMsQ0FBQztRQUVELElBQUksaUJBQWlCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEMsT0FBTyxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9ELENBQUM7UUFFRCxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztZQUNyRSxDQUFDO1lBQ0QsT0FBTyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDM0IsQ0FBQztRQUVELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUM5QixDQUFDO1FBRUQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekIsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDMUIsQ0FBQztRQUVELE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTNCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLHlCQUF5QjtZQUNsQyxPQUFPO1NBQ1IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQU1GLE1BQU0sb0JBQW9CLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQ2pFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQ2pDLE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRXJDLE1BQU0sZ0JBQWdCLEdBQ3BCLENBQUEsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsS0FBSywwQ0FBRSxHQUFHO2FBQ3ZCLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxPQUFPLENBQUE7YUFDckIsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsSUFBSSwwQ0FBRSxHQUFHLENBQUE7YUFDdkIsTUFBQSxHQUFHLENBQUMsSUFBSSwwQ0FBRSxPQUFPLENBQUEsQ0FBQztRQUVwQixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQzVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDckUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDbEUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUNsQyxhQUFxQixDQUFDLGVBQWUsQ0FDdkM7WUFDQyxDQUFDLENBQUUsYUFBcUIsQ0FBQyxlQUFlO1lBQ3hDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFUCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsSUFBSSxDQUNqQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQ2hELENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUEsYUFBcUIsQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FDN0QsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUNoRCxDQUFDO1FBRUYsTUFBTSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUseUJBQXlCO1lBQ2xDLGVBQWUsRUFBRyxhQUFxQixDQUFDLGVBQWU7U0FDeEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUtGLE1BQU0sK0JBQStCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLGVBQWUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFFdkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQzthQUNoRSxNQUFNLENBQUMsMkJBQTJCLENBQUM7YUFDbkMsSUFBSSxFQUFFLENBQUM7UUFFVixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsZUFBZSxFQUFHLGFBQXFCLENBQUMsR0FBRztZQUMzQyxJQUFJLEVBQUcsYUFBcUIsQ0FBQyxJQUFJO1lBQ2pDLElBQUksRUFBRyxhQUFxQixDQUFDLElBQUk7WUFDakMsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUUsYUFBcUIsQ0FBQyxlQUFlLENBQUM7Z0JBQ3BFLENBQUMsQ0FBRSxhQUFxQixDQUFDLGVBQWU7Z0JBQ3hDLENBQUMsQ0FBQyxFQUFFO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsZ0JBQU0sQ0FBQyxLQUFLLENBQ1YsMENBQTBDLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLLEVBQUUsQ0FDcEUsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDO0lBQzdFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQVNGLE1BQU0sZUFBZSxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUM1RCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRTVELE1BQU0sZ0JBQWdCLEdBQ3BCLENBQUEsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsS0FBSywwQ0FBRSxHQUFHLE1BQUssR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLE9BQU8sQ0FBQSxJQUFJLElBQUksQ0FBQztRQUU1RCxNQUFNLG1CQUFtQixHQUN2QixDQUFBLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLFFBQVEsMENBQUUsR0FBRzthQUMzQixNQUFDLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxJQUFJLDBDQUFFLEdBQUcsQ0FBQTthQUN2QixNQUFBLEdBQUcsQ0FBQyxJQUFJLDBDQUFFLE9BQU8sQ0FBQTtZQUNqQixJQUFJLENBQUM7UUFFUCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELElBQ0UsQ0FBQyxnQ0FBZ0MsQ0FDL0IsYUFBYSxFQUNiLGdCQUFnQixFQUNoQixtQkFBbUIsQ0FDcEIsRUFDRCxDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxpQ0FBaUMsQ0FDL0MsYUFBYSxFQUNiLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQ3RELENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLE1BQU0seUJBQWUsQ0FBQyxPQUFPLENBQUM7WUFDdkMsTUFBTSxFQUFFLFVBQVU7WUFDbEIsZUFBZTtZQUNmLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFHO1NBQzlCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLElBQUksR0FBRyxNQUFNLHlCQUFlLENBQUMsTUFBTSxDQUFDO2dCQUNsQyxNQUFNLEVBQUUsVUFBVTtnQkFDbEIsZUFBZTtnQkFDZixnQkFBZ0IsRUFBRSxPQUFPLENBQUMsR0FBRztnQkFDN0IsYUFBYSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sRUFBRSxRQUFRO2dCQUNoQixtQkFBbUIsRUFBRSxDQUFDO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsb0JBQW9CLEVBQUUsSUFBSTthQUMzQixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUNMLGdFQUFnRTtnQkFDbEUsSUFBSTtnQkFDSixPQUFPO2FBQ1IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV2RCxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQztRQUNoQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFFaEMsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQztRQUNuQyxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVsQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFDTCxJQUFJLENBQUMsTUFBTSxLQUFLLGtCQUFrQjtnQkFDaEMsQ0FBQyxDQUFDLGtDQUFrQztnQkFDcEMsQ0FBQyxDQUFDLGFBQWE7WUFDbkIsSUFBSTtZQUNKLE9BQU87WUFDUCxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sS0FBSyxrQkFBa0I7WUFDbkQsZUFBZSxFQUNiLElBQUksQ0FBQyxNQUFNLEtBQUssa0JBQWtCO2dCQUNoQyxDQUFDLENBQUMsQ0FBQztnQkFDSCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzFELENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNsRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFTRixNQUFNLG1CQUFtQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNoRSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRTVELE1BQU0sZ0JBQWdCLEdBQ3BCLENBQUEsTUFBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsS0FBSywwQ0FBRSxHQUFHLE1BQUssR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLE9BQU8sQ0FBQSxJQUFJLElBQUksQ0FBQztRQUU1RCxNQUFNLG1CQUFtQixHQUN2QixDQUFBLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLFFBQVEsMENBQUUsR0FBRzthQUMzQixNQUFDLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxJQUFJLDBDQUFFLEdBQUcsQ0FBQTthQUN2QixNQUFBLEdBQUcsQ0FBQyxJQUFJLDBDQUFFLE9BQU8sQ0FBQTtZQUNqQixJQUFJLENBQUM7UUFFUCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELElBQ0UsQ0FBQyxnQ0FBZ0MsQ0FDL0IsYUFBYSxFQUNiLGdCQUFnQixFQUNoQixtQkFBbUIsQ0FDcEIsRUFDRCxDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxpQ0FBaUMsQ0FDL0MsYUFBYSxFQUNiLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQ3RELENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSx5QkFBZSxDQUFDLE9BQU8sQ0FBQztZQUN6QyxNQUFNLEVBQUUsVUFBVTtZQUNsQixlQUFlO1lBQ2YsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEdBQUc7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxtQ0FBbUM7Z0JBQzVDLElBQUk7YUFDTCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFDdkIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRXZDLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRWxCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLG9DQUFvQztZQUM3QyxJQUFJO1lBQ0osT0FBTztTQUNSLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0RSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLENBQUMsQ0FBQztJQUM5RSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFPRixNQUFNLDhCQUE4QixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUMzRSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN2QyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUVoQyxNQUFNLGdCQUFnQixHQUNwQixDQUFBLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLEtBQUssMENBQUUsR0FBRzthQUN2QixHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsT0FBTyxDQUFBO2FBQ3JCLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsR0FBRyxDQUFBO1lBQ3ZCLElBQUksQ0FBQztRQUVQLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDNUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMzRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQ2xFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsaUNBQWlDLENBQy9DLGFBQWEsRUFDYixPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUN0RCxDQUFDO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0seUJBQWUsQ0FBQyxJQUFJLENBQUM7WUFDdkMsZUFBZTtZQUNmLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFHO1NBQzlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVWLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDaEMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDM0UsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUN2QyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxrQkFBa0IsQ0FDNUMsQ0FBQyxNQUFNLENBQUM7UUFFVCxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ3RDLENBQUMsR0FBVyxFQUFFLENBQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDLEVBQ2pFLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUN6QyxDQUFDLEdBQVcsRUFBRSxDQUFNLEVBQUUsRUFBRSxDQUN0QixHQUFHO1lBQ0gsTUFBTSxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLEVBQ3RFLENBQUMsQ0FDRixDQUFDO1FBRUYsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixlQUFlO1lBQ2YsT0FBTztZQUNQLEtBQUssRUFBRTtnQkFDTCxVQUFVO2dCQUNWLFdBQVc7Z0JBQ1gsb0JBQW9CO2dCQUNwQixtQkFBbUI7Z0JBQ25CLHNCQUFzQjthQUN2QjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUNWLHlDQUF5QyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQ25FLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixrQkFBZTtJQUNiLGlCQUFpQjtJQUNqQiwrQkFBK0I7SUFDL0Isb0JBQW9CO0lBQ3BCLG9CQUFvQjtJQUNwQixvQkFBb0I7SUFDcEIsK0JBQStCO0lBQy9CLGVBQWU7SUFDZixtQkFBbUI7SUFDbkIsOEJBQThCO0NBQy9CLENBQUMifQ==