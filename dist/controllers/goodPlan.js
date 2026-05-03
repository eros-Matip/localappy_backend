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
const GoodPlan_1 = __importDefault(require("../models/GoodPlan"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Owner_1 = __importDefault(require("../models/Owner"));
const Customer_1 = __importDefault(require("../models/Customer"));
const GoodPlanUse_1 = __importDefault(require("../models/GoodPlanUse"));
const CryptoJS = require("crypto-js");
const isValidObjectId = (id) => mongoose_1.default.isValidObjectId(id);
const GOOD_PLAN_DAYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
];
const parseJsonField = (value, fallback) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    if (Array.isArray(value) || typeof value === "object") {
        return value;
    }
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            return fallback;
        }
    }
    return fallback;
};
const normalizeText = (value) => {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
};
const normalizeDaysOfWeek = (value) => {
    const parsed = parseJsonField(value, []);
    if (!Array.isArray(parsed))
        return [];
    return parsed.filter((item) => {
        return GOOD_PLAN_DAYS.includes(item);
    });
};
const normalizeDate = (value) => {
    if (!value)
        return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
};
const GOOD_PLAN_QR_TTL_MS = 5 * 60 * 1000;
const getCustomerIdFromRequest = (req) => {
    var _a;
    const customer = req.customer || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.admin);
    if (!customer)
        return null;
    if (typeof customer === "string")
        return customer;
    if (customer._id)
        return String(customer._id);
    return null;
};
const createRandomNonce = () => {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
const decryptGoodPlanQrPayload = (encryptedValue) => {
    try {
        if (!process.env.SALT_SCAN) {
            throw new Error("SALT_SCAN manquant");
        }
        const bytes = CryptoJS.AES.decrypt(encryptedValue, process.env.SALT_SCAN);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (!originalText)
            return null;
        return JSON.parse(originalText);
    }
    catch (error) {
        return null;
    }
};
const encryptGoodPlanQrPayload = (payload) => {
    if (!process.env.SALT_SCAN) {
        throw new Error("SALT_SCAN manquant");
    }
    return CryptoJS.AES.encrypt(JSON.stringify(payload), process.env.SALT_SCAN).toString();
};
const checkCustomerCanScanForEstablishment = (scannerCustomerId, establishmentId) => __awaiter(void 0, void 0, void 0, function* () {
    const [scannerCustomer, establishment] = yield Promise.all([
        Customer_1.default.findById(scannerCustomerId)
            .select("_id establishmentStaffOf ownerAccount")
            .lean(),
        Establishment_1.default.findById(establishmentId).select("_id staff owner").lean(),
    ]);
    if (!scannerCustomer) {
        return {
            allowed: false,
            ownerId: null,
            reason: "Scanneur introuvable.",
        };
    }
    if (!establishment) {
        return {
            allowed: false,
            ownerId: null,
            reason: "Établissement introuvable.",
        };
    }
    const staffOfIds = Array.isArray(scannerCustomer.establishmentStaffOf)
        ? scannerCustomer.establishmentStaffOf.map((id) => String(id))
        : [];
    const establishmentStaffIds = Array.isArray(establishment.staff)
        ? establishment.staff.map((id) => String(id))
        : [];
    const isStaff = staffOfIds.includes(String(establishmentId)) ||
        establishmentStaffIds.includes(String(scannerCustomerId));
    if (isStaff) {
        return {
            allowed: true,
            ownerId: null,
            reason: "Staff autorisé.",
        };
    }
    const ownerAccountId = scannerCustomer.ownerAccount
        ? String(scannerCustomer.ownerAccount)
        : null;
    if (!ownerAccountId || !mongoose_1.default.isValidObjectId(ownerAccountId)) {
        return {
            allowed: false,
            ownerId: null,
            reason: "Le scanneur n'est pas staff ou owner de cet établissement.",
        };
    }
    const owner = yield Owner_1.default.findById(ownerAccountId)
        .select("_id establishments")
        .lean();
    if (!owner) {
        return {
            allowed: false,
            ownerId: null,
            reason: "Compte owner introuvable.",
        };
    }
    const ownerEstablishmentIds = Array.isArray(owner.establishments)
        ? owner.establishments.map((id) => String(id))
        : [];
    const establishmentOwnerIds = Array.isArray(establishment.owner)
        ? establishment.owner.map((id) => String(id))
        : [];
    const isOwner = ownerEstablishmentIds.includes(String(establishmentId)) ||
        establishmentOwnerIds.includes(String(owner._id));
    if (!isOwner) {
        return {
            allowed: false,
            ownerId: null,
            reason: "Le owner ne gère pas cet établissement.",
        };
    }
    return {
        allowed: true,
        ownerId: owner._id,
        reason: "Owner autorisé.",
    };
});
const getOwnerIdFromBody = (req) => {
    const owner = req.body.owner;
    if (!owner)
        return null;
    if (typeof owner === "string")
        return owner;
    if (owner._id)
        return String(owner._id);
    return null;
};
const checkOwnerCanManageEstablishment = (req, establishmentId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!isValidObjectId(establishmentId)) {
        return {
            allowed: false,
            status: 400,
            message: "Identifiant d'établissement invalide.",
            establishment: null,
            owner: null,
        };
    }
    const ownerId = getOwnerIdFromBody(req);
    if (!ownerId || !isValidObjectId(ownerId)) {
        return {
            allowed: false,
            status: 401,
            message: "Owner non authentifié.",
            establishment: null,
            owner: null,
        };
    }
    const [owner, establishment] = yield Promise.all([
        Owner_1.default.findById(ownerId).select("_id establishments isValidated isVerified"),
        Establishment_1.default.findById(establishmentId).select("_id name owner goodPlans activated banned deletedAt"),
    ]);
    if (!owner) {
        return {
            allowed: false,
            status: 404,
            message: "Owner introuvable.",
            establishment: null,
            owner: null,
        };
    }
    if (!establishment) {
        return {
            allowed: false,
            status: 404,
            message: "Établissement introuvable.",
            establishment: null,
            owner: null,
        };
    }
    if (establishment.deletedAt) {
        return {
            allowed: false,
            status: 410,
            message: "Établissement supprimé.",
            establishment: null,
            owner: null,
        };
    }
    if (establishment.banned) {
        return {
            allowed: false,
            status: 403,
            message: "Établissement banni.",
            establishment: null,
            owner: null,
        };
    }
    const establishmentOwnerIds = (establishment.owner || []).map((id) => String(id));
    const ownerEstablishmentIds = (owner.establishments || []).map((id) => String(id));
    const ownerCanManage = establishmentOwnerIds.includes(String(owner._id)) ||
        ownerEstablishmentIds.includes(String(establishment._id));
    if (!ownerCanManage) {
        return {
            allowed: false,
            status: 403,
            message: "Vous n'avez pas les droits pour gérer cet établissement.",
            establishment: null,
            owner: null,
        };
    }
    return {
        allowed: true,
        status: 200,
        message: "Autorisé.",
        establishment,
        owner,
    };
});
const buildPublicGoodPlanFilter = () => {
    const now = new Date();
    return {
        status: "published",
        isActive: true,
        deletedAt: null,
        startDate: { $lte: now },
        endDate: { $gte: now },
    };
};
const createGoodPlanForAnEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { establishmentId } = req.params;
        const access = yield checkOwnerCanManageEstablishment(req, establishmentId);
        if (!access.allowed || !access.establishment || !access.owner) {
            return res.status(access.status).json({ message: access.message });
        }
        const { title, shortDescription, description, type, image, startDate, endDate, availability, conditions, redemption, publishNow, } = req.body;
        if (!title || typeof title !== "string" || title.trim() === "") {
            return res.status(400).json({
                message: "Le titre est obligatoire.",
            });
        }
        if (!shortDescription ||
            typeof shortDescription !== "string" ||
            shortDescription.trim() === "") {
            return res.status(400).json({
                message: "La description courte est obligatoire.",
            });
        }
        const parsedStartDate = normalizeDate(startDate);
        const parsedEndDate = normalizeDate(endDate);
        if (!parsedStartDate) {
            return res.status(400).json({
                message: "La date de début est invalide ou manquante.",
            });
        }
        if (!parsedEndDate) {
            return res.status(400).json({
                message: "La date de fin est invalide ou manquante.",
            });
        }
        if (parsedEndDate < parsedStartDate) {
            return res.status(400).json({
                message: "La date de fin ne peut pas être avant la date de début.",
            });
        }
        const normalizedTitle = normalizeText(title);
        const existingGoodPlan = yield GoodPlan_1.default.findOne({
            establishment: access.establishment._id,
            deletedAt: null,
            type: type || "custom",
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            title: { $regex: new RegExp(`^${normalizedTitle}$`, "i") },
        });
        if (existingGoodPlan) {
            return res.status(409).json({
                message: "Un bon plan similaire existe déjà pour cet établissement.",
                goodPlan: existingGoodPlan,
            });
        }
        const parsedAvailability = parseJsonField(availability, {});
        const parsedRedemption = parseJsonField(redemption, {});
        const shouldPublish = publishNow === true || publishNow === "true";
        const maxUses = parsedRedemption.maxUses !== undefined &&
            parsedRedemption.maxUses !== null &&
            parsedRedemption.maxUses !== ""
            ? Number(parsedRedemption.maxUses)
            : null;
        const safeMaxUses = typeof maxUses === "number" && Number.isFinite(maxUses) ? maxUses : null;
        const newGoodPlan = new GoodPlan_1.default({
            title: title.trim(),
            shortDescription: shortDescription.trim(),
            description: typeof description === "string" ? description.trim() : "",
            type: type || "custom",
            establishment: access.establishment._id,
            createdByOwner: access.owner._id,
            createdByCustomer: null,
            image: typeof image === "string" && image.trim() !== "" ? image : null,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            availability: {
                daysOfWeek: normalizeDaysOfWeek(parsedAvailability.daysOfWeek),
                startTime: typeof parsedAvailability.startTime === "string"
                    ? parsedAvailability.startTime
                    : null,
                endTime: typeof parsedAvailability.endTime === "string"
                    ? parsedAvailability.endTime
                    : null,
            },
            conditions: typeof conditions === "string" ? conditions.trim() : "",
            redemption: {
                mode: parsedRedemption.mode || "none",
                code: typeof parsedRedemption.code === "string"
                    ? parsedRedemption.code.trim().toUpperCase()
                    : null,
                maxUses: safeMaxUses,
                usesCount: 0,
                oneUsePerUser: parsedRedemption.oneUsePerUser === true ||
                    parsedRedemption.oneUsePerUser === "true",
            },
            stats: {
                views: 0,
                clicks: 0,
                uses: 0,
            },
            clics: [],
            status: shouldPublish ? "published" : "draft",
            isActive: shouldPublish,
            deletedAt: null,
        });
        yield newGoodPlan.save();
        yield Establishment_1.default.findByIdAndUpdate(access.establishment._id, {
            $addToSet: { goodPlans: newGoodPlan._id },
        });
        return res.status(201).json({
            message: shouldPublish
                ? "Bon plan créé et publié avec succès."
                : "Bon plan créé en brouillon avec succès.",
            goodPlan: newGoodPlan,
        });
    }
    catch (error) {
        console.error("Error creating good plan:", error);
        return res.status(500).json({
            message: "Erreur lors de la création du bon plan.",
            error: error instanceof Error ? error.message : error,
        });
    }
});
const getGoodPlansByPosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { latitude, longitude, radius } = req.body;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
        const parsedRadius = radius !== undefined && radius !== null && radius !== ""
            ? parseFloat(radius)
            : 50;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                message: "La latitude et la longitude sont requises.",
            });
        }
        const lat = typeof latitude === "number" ? latitude : parseFloat(latitude);
        const lon = typeof longitude === "number" ? longitude : parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({
                message: "Les coordonnées fournies ne sont pas valides.",
            });
        }
        const finalRadiusKm = Number.isFinite(parsedRadius) ? parsedRadius : 50;
        const toRad = (value) => (value * Math.PI) / 180;
        const haversineDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371;
            const dLat = toRad(lat2 - lat1);
            const dLng = toRad(lng2 - lng1);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) *
                    Math.cos(toRad(lat2)) *
                    Math.sin(dLng / 2) *
                    Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };
        const goodPlans = yield GoodPlan_1.default.find(buildPublicGoodPlanFilter())
            .populate({
            path: "establishment",
            select: "_id name logo photos address location openingHours activated banned deletedAt",
            match: {
                activated: true,
                banned: false,
                deletedAt: null,
            },
        })
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();
        const filtered = goodPlans
            .filter((goodPlan) => {
            var _a, _b;
            const establishment = goodPlan.establishment;
            if (!establishment)
                return false;
            const estLat = (_a = establishment.location) === null || _a === void 0 ? void 0 : _a.lat;
            const estLng = (_b = establishment.location) === null || _b === void 0 ? void 0 : _b.lng;
            if (typeof estLat !== "number" || typeof estLng !== "number") {
                return false;
            }
            const distance = haversineDistance(lat, lon, estLat, estLng);
            goodPlan.distance = distance;
            goodPlan.distanceKm = Number(distance.toFixed(2));
            return distance <= finalRadiusKm;
        })
            .sort((a, b) => a.distance - b.distance);
        const total = filtered.length;
        const paginated = filtered.slice((page - 1) * limit, page * limit);
        return res.status(200).json({
            metadata: {
                radiusKm: finalRadiusKm,
                total,
                currentPage: page,
                pageSize: limit,
            },
            goodPlans: paginated,
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération des bons plans :", error);
        return res.status(500).json({
            message: "Erreur interne du serveur.",
        });
    }
});
const getPublicGoodPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
        const type = req.query.type;
        const filter = buildPublicGoodPlanFilter();
        if (type && type !== "all") {
            filter.type = type;
        }
        const [goodPlans, total] = yield Promise.all([
            GoodPlan_1.default.find(filter)
                .select("_id title shortDescription description type image startDate endDate availability conditions redemption.mode stats.views stats.uses establishment createdAt")
                .populate({
                path: "establishment",
                select: "name logo photos address location openingHours",
                match: {
                    activated: true,
                    banned: false,
                    deletedAt: null,
                },
            })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            GoodPlan_1.default.countDocuments(filter),
        ]);
        const filteredGoodPlans = goodPlans.filter((goodPlan) => goodPlan.establishment);
        return res.status(200).json({
            metadata: {
                total,
                currentPage: page,
                pageSize: limit,
            },
            goodPlans: filteredGoodPlans,
        });
    }
    catch (error) {
        console.error("Erreur récupération bons plans publics:", error);
        return res.status(500).json({
            message: "Erreur lors de la récupération des bons plans.",
        });
    }
});
const getGoodPlansForAnEstablishmentPublic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { establishmentId } = req.params;
        if (!isValidObjectId(establishmentId)) {
            return res.status(400).json({
                message: "Identifiant d'établissement invalide.",
            });
        }
        const establishment = yield Establishment_1.default.findOne({
            _id: establishmentId,
            activated: true,
            banned: false,
            deletedAt: null,
        }).select("_id name");
        if (!establishment) {
            return res.status(404).json({
                message: "Établissement introuvable.",
            });
        }
        const goodPlans = yield GoodPlan_1.default.find(Object.assign({ establishment: establishmentId }, buildPublicGoodPlanFilter()))
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({
            count: goodPlans.length,
            goodPlans,
        });
    }
    catch (error) {
        console.error("Erreur récupération bons plans établissement:", error);
        return res.status(500).json({
            message: "Erreur lors de la récupération des bons plans.",
        });
    }
});
const getGoodPlansForAnEstablishmentOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { establishmentId } = req.params;
        const access = yield checkOwnerCanManageEstablishment(req, establishmentId);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }
        const goodPlans = yield GoodPlan_1.default.find({
            establishment: establishmentId,
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({
            count: goodPlans.length,
            goodPlans,
        });
    }
    catch (error) {
        console.error("Erreur récupération bons plans owner:", error);
        return res.status(500).json({
            message: "Erreur lors de la récupération des bons plans de l'établissement.",
        });
    }
});
const readGoodPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goodPlanId } = req.params;
        let { source } = req.body;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        if (source === "deeplink") {
            source = "scannés";
        }
        const goodPlan = yield GoodPlan_1.default.findOneAndUpdate({
            _id: goodPlanId,
            deletedAt: null,
        }, {
            $inc: { "stats.views": 1 },
            $push: {
                clics: {
                    source: source || "app",
                    date: new Date(),
                },
            },
        }, { new: true }).populate({
            path: "establishment",
            select: "_id name logo photos address location contact openingHours activated banned deletedAt",
        });
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan introuvable.",
            });
        }
        return res.status(200).json({
            message: goodPlan,
        });
    }
    catch (error) {
        console.error("Erreur lecture bon plan:", error);
        return res.status(500).json({
            message: "Erreur lors de la lecture du bon plan.",
            error,
        });
    }
});
const updateGoodPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goodPlanId } = req.params;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne({
            _id: goodPlanId,
            deletedAt: null,
        });
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan introuvable.",
            });
        }
        const access = yield checkOwnerCanManageEstablishment(req, String(goodPlan.establishment));
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }
        if (req.body.title !== undefined) {
            if (typeof req.body.title !== "string" || req.body.title.trim() === "") {
                return res.status(400).json({
                    message: "Titre invalide.",
                });
            }
            goodPlan.title = req.body.title.trim();
        }
        if (req.body.shortDescription !== undefined) {
            if (typeof req.body.shortDescription !== "string" ||
                req.body.shortDescription.trim() === "") {
                return res.status(400).json({
                    message: "Description courte invalide.",
                });
            }
            goodPlan.shortDescription = req.body.shortDescription.trim();
        }
        if (req.body.description !== undefined) {
            goodPlan.description =
                typeof req.body.description === "string"
                    ? req.body.description.trim()
                    : goodPlan.description;
        }
        if (req.body.type !== undefined) {
            goodPlan.type = req.body.type;
        }
        if (req.body.image !== undefined) {
            goodPlan.image =
                typeof req.body.image === "string" && req.body.image.trim() !== ""
                    ? req.body.image
                    : null;
        }
        if (req.body.startDate !== undefined) {
            const parsedStartDate = normalizeDate(req.body.startDate);
            if (!parsedStartDate) {
                return res.status(400).json({
                    message: "La date de début est invalide.",
                });
            }
            goodPlan.startDate = parsedStartDate;
        }
        if (req.body.endDate !== undefined) {
            const parsedEndDate = normalizeDate(req.body.endDate);
            if (!parsedEndDate) {
                return res.status(400).json({
                    message: "La date de fin est invalide.",
                });
            }
            goodPlan.endDate = parsedEndDate;
        }
        if (goodPlan.endDate < goodPlan.startDate) {
            return res.status(400).json({
                message: "La date de fin ne peut pas être avant la date de début.",
            });
        }
        if (req.body.availability !== undefined) {
            const parsedAvailability = parseJsonField(req.body.availability, {});
            goodPlan.availability = {
                daysOfWeek: normalizeDaysOfWeek(parsedAvailability.daysOfWeek),
                startTime: typeof parsedAvailability.startTime === "string"
                    ? parsedAvailability.startTime
                    : null,
                endTime: typeof parsedAvailability.endTime === "string"
                    ? parsedAvailability.endTime
                    : null,
            };
        }
        if (req.body.conditions !== undefined) {
            goodPlan.conditions =
                typeof req.body.conditions === "string"
                    ? req.body.conditions.trim()
                    : "";
        }
        if (req.body.redemption !== undefined) {
            const parsedRedemption = parseJsonField(req.body.redemption, {});
            const maxUses = parsedRedemption.maxUses !== undefined &&
                parsedRedemption.maxUses !== null &&
                parsedRedemption.maxUses !== ""
                ? Number(parsedRedemption.maxUses)
                : null;
            const safeMaxUses = typeof maxUses === "number" && Number.isFinite(maxUses)
                ? maxUses
                : null;
            goodPlan.redemption = {
                mode: parsedRedemption.mode || goodPlan.redemption.mode || "none",
                code: typeof parsedRedemption.code === "string"
                    ? parsedRedemption.code.trim().toUpperCase()
                    : null,
                maxUses: safeMaxUses,
                usesCount: goodPlan.redemption.usesCount || 0,
                oneUsePerUser: parsedRedemption.oneUsePerUser === true ||
                    parsedRedemption.oneUsePerUser === "true",
            };
        }
        const updatedGoodPlan = yield goodPlan.save();
        return res.status(200).json({
            message: "Bon plan mis à jour avec succès.",
            goodPlan: updatedGoodPlan,
        });
    }
    catch (error) {
        console.error("Erreur updateGoodPlan:", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour du bon plan.",
            error,
        });
    }
});
const publishGoodPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goodPlanId } = req.params;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne({
            _id: goodPlanId,
            deletedAt: null,
        });
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan introuvable.",
            });
        }
        const access = yield checkOwnerCanManageEstablishment(req, String(goodPlan.establishment));
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }
        if (goodPlan.endDate < new Date()) {
            return res.status(400).json({
                message: "Impossible de publier un bon plan déjà expiré.",
            });
        }
        goodPlan.status = "published";
        goodPlan.isActive = true;
        yield goodPlan.save();
        return res.status(200).json({
            message: "Bon plan publié avec succès.",
            goodPlan,
        });
    }
    catch (error) {
        console.error("Erreur publishGoodPlan:", error);
        return res.status(500).json({
            message: "Erreur lors de la publication du bon plan.",
            error,
        });
    }
});
const disableGoodPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goodPlanId } = req.params;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne({
            _id: goodPlanId,
            deletedAt: null,
        });
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan introuvable.",
            });
        }
        const access = yield checkOwnerCanManageEstablishment(req, String(goodPlan.establishment));
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }
        goodPlan.status = "disabled";
        goodPlan.isActive = false;
        yield goodPlan.save();
        return res.status(200).json({
            message: "Bon plan désactivé avec succès.",
            goodPlan,
        });
    }
    catch (error) {
        console.error("Erreur disableGoodPlan:", error);
        return res.status(500).json({
            message: "Erreur lors de la désactivation du bon plan.",
            error,
        });
    }
});
const generateGoodPlanQr = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { goodPlanId } = req.params;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        const customerId = getCustomerIdFromRequest(req);
        if (!customerId || !isValidObjectId(customerId)) {
            return res.status(401).json({
                message: "Utilisateur non authentifié.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne(Object.assign({ _id: goodPlanId }, buildPublicGoodPlanFilter())).select("_id establishment title redemption status isActive startDate endDate deletedAt");
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan indisponible ou expiré.",
            });
        }
        const maxUses = (_a = goodPlan.redemption) === null || _a === void 0 ? void 0 : _a.maxUses;
        const usesCount = ((_b = goodPlan.redemption) === null || _b === void 0 ? void 0 : _b.usesCount) || 0;
        if (typeof maxUses === "number" && usesCount >= maxUses) {
            return res.status(409).json({
                message: "Ce bon plan a atteint sa limite d'utilisation.",
            });
        }
        if ((_c = goodPlan.redemption) === null || _c === void 0 ? void 0 : _c.oneUsePerUser) {
            const alreadyUsed = yield GoodPlanUse_1.default.exists({
                goodPlan: goodPlan._id,
                customer: customerId,
                status: "validated",
            });
            if (alreadyUsed) {
                return res.status(409).json({
                    message: "Vous avez déjà utilisé ce bon plan.",
                });
            }
        }
        const issuedAt = new Date();
        const expiresAt = new Date(Date.now() + GOOD_PLAN_QR_TTL_MS);
        const payload = {
            type: "goodPlan",
            goodPlanId: String(goodPlan._id),
            customerId: String(customerId),
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            nonce: createRandomNonce(),
        };
        const qrValue = encryptGoodPlanQrPayload(payload);
        return res.status(200).json({
            message: "QR code généré avec succès.",
            qrValue,
            expiresAt,
            goodPlan: {
                _id: goodPlan._id,
                title: goodPlan.title,
            },
        });
    }
    catch (error) {
        console.error("Erreur generateGoodPlanQr:", error);
        return res.status(500).json({
            message: "Erreur lors de la génération du QR code.",
            error: error instanceof Error ? error.message : error,
        });
    }
});
const scanGoodPlanQr = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const scannerCustomerId = getCustomerIdFromRequest(req);
        const encryptedValue = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.url) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.qrValue);
        if (!scannerCustomerId || !isValidObjectId(scannerCustomerId)) {
            return res.status(401).json({
                message: "Scanneur non authentifié.",
            });
        }
        if (!encryptedValue || typeof encryptedValue !== "string") {
            return res.status(400).json({
                message: "QR code manquant ou invalide.",
            });
        }
        const payload = decryptGoodPlanQrPayload(encryptedValue);
        if (!payload || payload.type !== "goodPlan") {
            return res.status(400).json({
                message: "QR code de bon plan invalide.",
            });
        }
        const { goodPlanId, customerId, issuedAt, expiresAt } = payload;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide dans le QR code.",
            });
        }
        if (!isValidObjectId(customerId)) {
            return res.status(400).json({
                message: "Identifiant client invalide dans le QR code.",
            });
        }
        const expirationDate = new Date(expiresAt);
        if (!expiresAt || isNaN(expirationDate.getTime())) {
            return res.status(400).json({
                message: "Date d'expiration du QR code invalide.",
            });
        }
        if (expirationDate < new Date()) {
            return res.status(410).json({
                message: "QR code expiré. Demandez au client d'en générer un nouveau.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne(Object.assign({ _id: goodPlanId }, buildPublicGoodPlanFilter()));
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan indisponible ou expiré.",
            });
        }
        const establishmentId = String(goodPlan.establishment);
        const establishment = yield Establishment_1.default.findOne({
            _id: establishmentId,
            activated: true,
            banned: false,
            deletedAt: null,
        }).select("_id name");
        if (!establishment) {
            return res.status(404).json({
                message: "Établissement introuvable ou indisponible.",
            });
        }
        const authorization = yield checkCustomerCanScanForEstablishment(scannerCustomerId, establishmentId);
        if (!authorization.allowed) {
            return res.status(403).json({
                message: authorization.reason ||
                    "Vous n'êtes pas autorisé à valider ce bon plan.",
            });
        }
        const customer = yield Customer_1.default.findById(customerId).select("_id email account");
        if (!customer) {
            return res.status(404).json({
                message: "Client introuvable.",
            });
        }
        const maxUses = (_c = goodPlan.redemption) === null || _c === void 0 ? void 0 : _c.maxUses;
        const usesCount = ((_d = goodPlan.redemption) === null || _d === void 0 ? void 0 : _d.usesCount) || 0;
        if (typeof maxUses === "number" && usesCount >= maxUses) {
            return res.status(409).json({
                message: "Ce bon plan a atteint sa limite d'utilisation.",
            });
        }
        if ((_e = goodPlan.redemption) === null || _e === void 0 ? void 0 : _e.oneUsePerUser) {
            const alreadyUsed = yield GoodPlanUse_1.default.exists({
                goodPlan: goodPlan._id,
                customer: customer._id,
                status: "validated",
            });
            if (alreadyUsed) {
                return res.status(409).json({
                    message: "Ce client a déjà utilisé ce bon plan.",
                });
            }
        }
        const use = yield GoodPlanUse_1.default.create({
            goodPlan: goodPlan._id,
            establishment: establishment._id,
            customer: customer._id,
            scannedByCustomer: scannerCustomerId,
            scannedByOwner: authorization.ownerId || null,
            source: "qr_scan",
            status: "validated",
            qrIssuedAt: issuedAt ? new Date(issuedAt) : null,
            qrExpiresAt: expirationDate,
            usedAt: new Date(),
        });
        goodPlan.redemption.usesCount = (goodPlan.redemption.usesCount || 0) + 1;
        goodPlan.stats = {
            views: ((_f = goodPlan.stats) === null || _f === void 0 ? void 0 : _f.views) || 0,
            clicks: ((_g = goodPlan.stats) === null || _g === void 0 ? void 0 : _g.clicks) || 0,
            uses: (((_h = goodPlan.stats) === null || _h === void 0 ? void 0 : _h.uses) || 0) + 1,
        };
        yield goodPlan.save();
        return res.status(200).json({
            ok: true,
            message: "Bon plan validé avec succès.",
            use,
            customer: {
                _id: customer._id,
                email: customer.email,
                account: customer.account,
            },
            goodPlan: {
                _id: goodPlan._id,
                title: goodPlan.title,
                redemption: goodPlan.redemption,
                stats: goodPlan.stats,
            },
            establishment: {
                _id: establishment._id,
                name: establishment.name,
            },
        });
    }
    catch (error) {
        console.error("Erreur scanGoodPlanQr:", error);
        return res.status(500).json({
            message: "Erreur lors de la validation du bon plan.",
            error: error instanceof Error ? error.message : error,
        });
    }
});
const deleteGoodPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goodPlanId } = req.params;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne({
            _id: goodPlanId,
            deletedAt: null,
        });
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan introuvable.",
            });
        }
        const access = yield checkOwnerCanManageEstablishment(req, String(goodPlan.establishment));
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }
        goodPlan.deletedAt = new Date();
        goodPlan.status = "disabled";
        goodPlan.isActive = false;
        yield goodPlan.save();
        return res.status(200).json({
            message: "Bon plan supprimé avec succès.",
        });
    }
    catch (error) {
        console.error("Erreur deleteGoodPlan:", error);
        return res.status(500).json({
            message: "Erreur lors de la suppression du bon plan.",
            error,
        });
    }
});
const declareGoodPlanUse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { goodPlanId } = req.params;
        if (!isValidObjectId(goodPlanId)) {
            return res.status(400).json({
                message: "Identifiant de bon plan invalide.",
            });
        }
        const goodPlan = yield GoodPlan_1.default.findOne(Object.assign({ _id: goodPlanId }, buildPublicGoodPlanFilter()));
        if (!goodPlan) {
            return res.status(404).json({
                message: "Bon plan indisponible ou expiré.",
            });
        }
        const maxUses = (_a = goodPlan.redemption) === null || _a === void 0 ? void 0 : _a.maxUses;
        const usesCount = ((_b = goodPlan.redemption) === null || _b === void 0 ? void 0 : _b.usesCount) || 0;
        if (typeof maxUses === "number" && usesCount >= maxUses) {
            return res.status(409).json({
                message: "Ce bon plan a atteint sa limite d'utilisation.",
            });
        }
        goodPlan.redemption.usesCount += 1;
        goodPlan.stats.uses += 1;
        yield goodPlan.save();
        return res.status(200).json({
            message: "Utilisation du bon plan enregistrée.",
            goodPlan,
        });
    }
    catch (error) {
        console.error("Erreur declareGoodPlanUse:", error);
        return res.status(500).json({
            message: "Erreur lors de l'utilisation du bon plan.",
            error,
        });
    }
});
exports.default = {
    createGoodPlanForAnEstablishment,
    getGoodPlansByPosition,
    getPublicGoodPlans,
    getGoodPlansForAnEstablishmentPublic,
    getGoodPlansForAnEstablishmentOwner,
    readGoodPlan,
    updateGoodPlan,
    publishGoodPlan,
    disableGoodPlan,
    generateGoodPlanQr,
    scanGoodPlanQr,
    deleteGoodPlan,
    declareGoodPlanUse,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29vZFBsYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvZ29vZFBsYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsa0VBQTBDO0FBQzFDLDRFQUFvRDtBQUNwRCw0REFBb0M7QUFFcEMsa0VBQTBDO0FBQzFDLHdFQUFnRDtBQUVoRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFdEMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRWxFLE1BQU0sY0FBYyxHQUF3QjtJQUMxQyxRQUFRO0lBQ1IsU0FBUztJQUNULFdBQVc7SUFDWCxVQUFVO0lBQ1YsUUFBUTtJQUNSLFVBQVU7SUFDVixRQUFRO0NBQ1QsQ0FBQztBQUVGLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBVSxFQUFFLFFBQWEsRUFBRSxFQUFFO0lBQ25ELElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUMxRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3RELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDO1lBQ0gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLFFBQVEs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