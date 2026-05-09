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