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
const sanitizeFolderName = (name) => name
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
const getUploadedGoodPlanImageUrl = (req, establishmentName) => __awaiter(void 0, void 0, void 0, function* () {
    const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
    const allFiles = Object.values(filesObject).flat();
    if (!allFiles.length) {
        return null;
    }
    const folderName = sanitizeFolderName(establishmentName || "default");
    const firstFile = allFiles[0];
    const result = yield cloudinary_1.default.v2.uploader.upload(firstFile.path, {
        folder: `good-plans/${folderName}`,
    });
    return result.secure_url;
});
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
const getOwnerIdFromRequest = (req) => {
    var _a;
    const owner = req.owner || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.owner);
    if (!owner)
        return null;
    if (typeof owner === "string")
        return owner;
    if (owner._id)
        return String(owner._id);
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
    const ownerId = getOwnerIdFromRequest(req);
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
        const uploadedImageUrl = yield getUploadedGoodPlanImageUrl(req, access.establishment.name || "default");
        const finalImage = uploadedImageUrl ||
            (typeof image === "string" && image.trim() !== "" ? image.trim() : null);
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
            image: finalImage,
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
    var _a;
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
        const uploadedImageUrl = yield getUploadedGoodPlanImageUrl(req, ((_a = access.establishment) === null || _a === void 0 ? void 0 : _a.name) || "default");
        if (uploadedImageUrl) {
            goodPlan.image = uploadedImageUrl;
        }
        else if (req.body.image !== undefined) {
            goodPlan.image =
                typeof req.body.image === "string" && req.body.image.trim() !== ""
                    ? req.body.image.trim()
                    : null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29vZFBsYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvZ29vZFBsYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsNERBQW9DO0FBQ3BDLGtFQUEwQztBQUMxQyw0RUFBb0Q7QUFDcEQsNERBQW9DO0FBRXBDLGtFQUEwQztBQUMxQyx3RUFBZ0Q7QUFFaEQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sZUFBZSxHQUFHLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVsRSxNQUFNLGNBQWMsR0FBd0I7SUFDMUMsUUFBUTtJQUNSLFNBQVM7SUFDVCxXQUFXO0lBQ1gsVUFBVTtJQUNWLFFBQVE7SUFDUixVQUFVO0lBQ1YsUUFBUTtDQUNULENBQUM7QUFFRixNQUFNLGNBQWMsR0FBRyxDQUFDLEtBQVUsRUFBRSxRQUFhLEVBQUUsRUFBRTtJQUNuRCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDMUQsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN0RCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7SUFDSCxDQUFDO0lB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