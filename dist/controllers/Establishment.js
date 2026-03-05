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
const axios_1 = __importDefault(require("axios"));
const Owner_1 = __importDefault(require("../models/Owner"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Retour_1 = __importDefault(require("../library/Retour"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const slugify_1 = __importDefault(require("slugify"));
const mongoose_1 = __importDefault(require("mongoose"));
const Registration_1 = __importDefault(require("../models/Registration"));
const Customer_1 = __importDefault(require("../models/Customer"));
const QrScan_1 = __importDefault(require("../models/QrScan"));
const notifyAdmins_1 = require("../services/notifyAdmins");
const cloudinary = require("cloudinary");
const normalizeRna = (input) => {
    if (!input)
        return null;
    const cleaned = String(input)
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9]/g, "");
    if (/^W\d{9}$/.test(cleaned))
        return cleaned;
    if (/^\d{9}$/.test(cleaned))
        return `W${cleaned}`;
    return null;
};
const createEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    const { activity, website, facebook, instagram, twitter, adressLabel, society, siret, rna, adress, city, zip, activityCodeNAF, legalForm, } = req.body;
    const form = String(legalForm || "company");
    const isAssociation = form === "association";
    if (!activity || !adressLabel || !society || !adress || !city || !zip) {
        Retour_1.default.warn("Some value is missing");
        return res.status(400).json({ message: "Some value is missing" });
    }
    if (!isAssociation) {
        if (!siret || !/^\d{14}$/.test(String(siret).trim())) {
            Retour_1.default.warn("SIRET missing/invalid");
            return res.status(400).json({ message: "SIRET manquant ou invalide." });
        }
    }
    else {
        const rnaNorm = normalizeRna(rna);
        if (!rnaNorm) {
            Retour_1.default.warn("RNA missing/invalid");
            return res.status(400).json({
                message: "RNA manquant ou invalide. Format attendu: W######### ou #########",
            });
        }
    }
    const fileArr = req.files ? Object(req.files).photos : [];
    const hasFile = Array.isArray(fileArr) && fileArr.length > 0;
    try {
        const ownerFromMiddleware = req.owner;
        if (!(ownerFromMiddleware === null || ownerFromMiddleware === void 0 ? void 0 : ownerFromMiddleware._id)) {
            return res.status(401).json({ message: "Unauthorized (owner missing)" });
        }
        const owner = ownerFromMiddleware;
        if (!owner) {
            Retour_1.default.warn("Owner not found");
            return res.status(404).json({ message: "Owner not found" });
        }
        if (!owner.isVerified) {
            Retour_1.default.warn("Owner not verified");
            return res.status(403).json({
                message: "Owner phone not verified",
                action: "VERIFY_PHONE_REQUIRED",
            });
        }
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adressLabel)}`);
        if (!((_a = responseApiGouv.data.features) === null || _a === void 0 ? void 0 : _a.length)) {
            Retour_1.default.warn("Invalid address, no coordinates found.");
            return res
                .status(400)
                .json({ message: "Invalid address, no coordinates found." });
        }
        const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
        const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        let uploadResult = null;
        if (hasFile) {
            const cloudinaryFolder = `${owner.account.firstname}_${owner.account.name}_folder`;
            const result = yield cloudinary.v2.uploader.upload(fileArr[0].path, {
                folder: cloudinaryFolder,
                public_id: isAssociation ? "AssociationDocument" : "KBis",
                resource_type: "auto",
            });
            uploadResult = {
                public_id: result.public_id,
                secure_url: result.secure_url,
            };
        }
        if (!isAssociation) {
            const existing = yield Establishment_1.default.findOne({
                "legalInfo.siret": String(siret).trim(),
            });
            if (existing) {
                const ownerIdStr = String(owner._id);
                const existingOwnerValue = existing.owner;
                const isAlreadyLinked = Array.isArray(existingOwnerValue)
                    ? existingOwnerValue.some((id) => String(id) === ownerIdStr)
                    : existingOwnerValue
                        ? String(existingOwnerValue) === ownerIdStr
                        : false;
                if (isAlreadyLinked) {
                    Retour_1.default.info("Establishment already linked to this owner (SIRET)");
                    return res.status(200).json({
                        message: "Establishment already linked to this owner",
                        establishment: existing,
                        activated: existing.activated,
                        needsLegalDoc: !hasFile && !((_b = existing === null || existing === void 0 ? void 0 : existing.legalInfo) === null || _b === void 0 ? void 0 : _b.KBis) ? true : false,
                        legalDocType: "KBIS",
                    });
                }
                const pendingArr = (owner.establishments ||
                    []);
                const alreadyPending = pendingArr.some((id) => String(id) === String(existing._id));
                if (alreadyPending) {
                    Retour_1.default.warn("Activation/claim request already pending (SIRET)");
                    return res.status(409).json({
                        message: "A request is already pending for this establishment",
                        establishment: existing,
                        status: "PENDING",
                    });
                }
                if (uploadResult) {
                    existing.legalInfo = existing.legalInfo || {};
                    if (!((_c = existing === null || existing === void 0 ? void 0 : existing.legalInfo) === null || _c === void 0 ? void 0 : _c.KBis)) {
                        existing.legalInfo.KBis = {
                            public_id: uploadResult.public_id,
                            secure_url: uploadResult.secure_url,
                        };
                    }
                }
                existing.activationRequested = true;
                existing.activationRequestedAt = new Date();
                existing.activationStatus = "pending";
                existing.owner.push(owner._id);
                yield existing.save();
                owner.establishments = owner.establishments || [];
                owner.establishments.push(existing._id);
                yield owner.save();
                (0, notifyAdmins_1.notifyAdminsNewEstablishment)({
                    establishmentId: String(existing._id),
                    establishmentName: existing.name || society,
                    legalForm: "company",
                    ownerId: String(owner._id),
                    ownerFirstname: owner.account.firstname,
                    ownerName: owner.account.name,
                }).catch((e) => console.error("Admin notification failed:", e));
                const needsLegalDoc = !hasFile && !((_d = existing === null || existing === void 0 ? void 0 : existing.legalInfo) === null || _d === void 0 ? void 0 : _d.KBis);
                Retour_1.default.info("Claim request created successfully (SIRET)");
                return res.status(201).json({
                    message: "Claim request created. Waiting for admin validation.",
                    establishment: existing,
                    status: "PENDING",
                    activated: existing.activated,
                    needsLegalDoc,
                    legalDocType: "KBIS",
                });
            }
        }
        else {
            const rnaNorm = normalizeRna(rna);
            const existing = yield Establishment_1.default.findOne({
                legalForm: "association",
                "legalInfo.rna": rnaNorm,
            });
            if (existing) {
                const ownerIdStr = String(owner._id);
                const existingOwnerValue = existing.owner;
                const isAlreadyLinked = Array.isArray(existingOwnerValue)
                    ? existingOwnerValue.some((id) => String(id) === ownerIdStr)
                    : existingOwnerValue
                        ? String(existingOwnerValue) === ownerIdStr
                        : false;
                if (isAlreadyLinked) {
                    Retour_1.default.info("Establishment already linked to this owner (RNA)");
                    return res.status(200).json({
                        message: "Establishment already linked to this owner",
                        establishment: existing,
                        activated: existing.activated,
                        needsLegalDoc: !hasFile && !((_e = existing === null || existing === void 0 ? void 0 : existing.legalInfo) === null || _e === void 0 ? void 0 : _e.legalDocument)
                            ? true
                            : false,
                        legalDocType: "ASSOCIATION_DOC",
                    });
                }
                const pendingArr = (owner.establishments ||
                    []);
                const alreadyPending = pendingArr.some((id) => String(id) === String(existing._id));
                if (alreadyPending) {
                    Retour_1.default.warn("Activation/claim request already pending (RNA)");
                    return res.status(409).json({
                        message: "A request is already pending for this establishment",
                        establishment: existing,
                        status: "PENDING",
                    });
                }
                if (uploadResult) {
                    existing.legalInfo = existing.legalInfo || {};
                    if (!((_f = existing === null || existing === void 0 ? void 0 : existing.legalInfo) === null || _f === void 0 ? void 0 : _f.legalDocument)) {
                        existing.legalInfo.legalDocument = {
                            public_id: uploadResult.public_id,
                            secure_url: uploadResult.secure_url,
                            label: "Statuts / Récépissé",
                        };
                    }
                }
                existing.activationRequested = true;
                existing.activationRequestedAt = new Date();
                existing.activationStatus = "pending";
                existing.owner.push(owner._id);
                yield existing.save();
                owner.establishments = owner.establishments || [];
                owner.establishments.push(existing._id);
                yield owner.save();
                (0, notifyAdmins_1.notifyAdminsNewEstablishment)({
                    establishmentId: String(existing._id),
                    establishmentName: existing.name || society,
                    legalForm: "association",
                    ownerId: String(owner._id),
                    ownerFirstname: owner.account.firstname,
                    ownerName: owner.account.name,
                }).catch((e) => console.error("Admin notification failed:", e));
                const needsLegalDoc = !hasFile && !((_g = existing === null || existing === void 0 ? void 0 : existing.legalInfo) === null || _g === void 0 ? void 0 : _g.legalDocument);
                Retour_1.default.info("Claim request created successfully (RNA)");
                return res.status(201).json({
                    message: "Claim request created. Waiting for admin validation.",
                    establishment: existing,
                    status: "PENDING",
                    activated: existing.activated,
                    needsLegalDoc,
                    legalDocType: "ASSOCIATION_DOC",
                });
            }
        }
        const establishment = new Establishment_1.default({
            name: society,
            type: Array.isArray(activity) ? activity : [activity],
            legalForm: isAssociation ? "association" : "company",
            address: {
                street: adress,
                city,
                postalCode: zip,
                country: "FRANCE",
            },
            location: {
                lat: latitude,
                lng: longitude,
            },
            contact: {
                website,
                socialMedia: { facebook, instagram, twitter },
            },
            legalInfo: {
                siret: !isAssociation
                    ? String(siret).trim()
                    : siret
                        ? String(siret).trim()
                        : undefined,
                KBis: !isAssociation && uploadResult
                    ? {
                        public_id: uploadResult.public_id,
                        secure_url: uploadResult.secure_url,
                    }
                    : undefined,
                rna: isAssociation ? normalizeRna(rna) : undefined,
                legalDocument: isAssociation && uploadResult
                    ? {
                        public_id: uploadResult.public_id,
                        secure_url: uploadResult.secure_url,
                        label: "Statuts / Récépissé",
                    }
                    : undefined,
                activityCodeNAF: activityCodeNAF || undefined,
            },
            owner: [owner._id],
            events: [],
            ads: [],
            staff: [],
            activated: false,
        });
        establishment.owner.push(owner._id);
        yield establishment.save();
        owner.establishments.push(establishment._id);
        yield owner.save();
        (0, notifyAdmins_1.notifyAdminsNewEstablishment)({
            establishmentId: String(establishment._id),
            establishmentName: society,
            legalForm: isAssociation ? "association" : "company",
            ownerId: String(owner._id),
            ownerFirstname: owner.account.firstname,
            ownerName: owner.account.name,
        }).catch((e) => console.error("Admin notification failed:", e));
        const needsLegalDoc = !hasFile;
        Retour_1.default.info("Establishment created successfully (draft mode)");
        return res.status(201).json({
            message: "Establishment created successfully",
            establishment,
            activated: establishment.activated,
            needsLegalDoc,
            legalDocType: isAssociation ? "ASSOCIATION_DOC" : "KBIS",
        });
    }
    catch (error) {
        Retour_1.default.error(`Error creating establishment: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to create establishment",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const getAllFiles = (directory) => {
    if (!fs_1.default.existsSync(directory))
        return [];
    return fs_1.default.readdirSync(directory).flatMap((item) => {
        const fullPath = path_1.default.join(directory, item);
        if (fs_1.default.lstatSync(fullPath).isDirectory()) {
            return getAllFiles(fullPath);
        }
        return fullPath.endsWith(".json") ? [fullPath] : [];
    });
};
const getAllInformation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const establishmentFinded = yield Establishment_1.default.findById(req.params.establishmentId).populate([
            {
                path: "staff",
                model: "Customer",
            },
            {
                path: "events",
                model: "Event",
                populate: { path: "registrations", select: "quantity" },
            },
        ]);
        if (!establishmentFinded || !establishmentFinded.events) {
            return res.status(404).json({ error: "Etablissement introuvable" });
        }
        const statsByCategory = {
            publicités: 0,
            scannés: 0,
            promotions: 0,
            inscriptions: 0,
            clics: 0,
        };
        const events = establishmentFinded.events.map((evt) => {
            var _a;
            if (Array.isArray(evt.clics)) {
                for (const c of evt.clics) {
                    switch ((_a = c === null || c === void 0 ? void 0 : c.source) === null || _a === void 0 ? void 0 : _a.toLowerCase()) {
                        case "publicités":
                            statsByCategory.publicités++;
                            break;
                        case "scannés":
                            statsByCategory.scannés++;
                            break;
                        case "promotions":
                            statsByCategory.promotions++;
                            break;
                        case "inscriptions":
                            break;
                        default:
                            statsByCategory.clics++;
                            break;
                    }
                }
            }
            const registrationsCount = Array.isArray(evt.registrations)
                ? evt.registrations.reduce((sum, r) => sum + ((r === null || r === void 0 ? void 0 : r.quantity) || 0), 0)
                : 0;
            statsByCategory.inscriptions += registrationsCount;
            const base = typeof evt.toObject === "function" ? evt.toObject() : evt;
            return Object.assign(Object.assign({}, base), { registrationsCount });
        });
        return res.status(200).json({
            establishment: establishmentFinded,
            totalEvents: events.length,
            statsByCategory,
            events,
        });
    }
    catch (error) {
        console.error("Erreur getAllInformation:", error);
        return res.status(500).json({
            error: "Échec lors de la récupération des informations de l'établissement.",
        });
    }
});
const getPublicInformation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const establishment = yield Establishment_1.default.findById(req.params.establishmentId)
            .select("name description address location photos openingHours logo events contact acceptedPayments legalForm descriptionI18n")
            .populate({
            path: "events",
            match: {
                isDraft: false,
                endingDate: { $gt: new Date() },
            },
            options: {
                sort: { startingDate: 1, endingDate: 1 },
            },
        });
        if (!establishment || !Array.isArray(establishment.events)) {
            return res
                .status(404)
                .json({ error: "Établissement introuvable ou sans événements." });
        }
        const events = establishment.events;
        return res.status(200).json({
            totalEvents: events.length,
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`Erreur getPublicInformation: ${error}`);
        return res.status(500).json({
            error: "Erreur lors de la récupération des données publiques.",
        });
    }
});
const trackEstablishmentQrScan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const establishmentId = req.params.establishmentId;
        const ip = ((_b = (_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
            req.socket.remoteAddress ||
            "unknown";
        const userAgent = String(req.headers["user-agent"] || "");
        if (ip === "unknown") {
            yield QrScan_1.default.create({
                establishment: establishmentId,
                scannedAt: new Date(),
                ip,
                userAgent,
                source: "unknown",
            });
            return res.status(204).send();
        }
        const since = new Date(Date.now() - 2 * 60 * 1000);
        const already = yield QrScan_1.default.findOne({
            establishment: establishmentId,
            ip,
            scannedAt: { $gte: since },
        }).select("_id");
        if (!already) {
            yield QrScan_1.default.create({
                establishment: establishmentId,
                scannedAt: new Date(),
                ip,
                userAgent,
                source: "flyer",
            });
        }
        return res.status(204).send();
    }
    catch (error) {
        Retour_1.default.error(`Erreur trackEstablishmentQrScan: ${error}`);
        return res.status(500).json({ error: "Erreur tracking QR." });
    }
});
const getTicketsStatsByEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const estId = new mongoose_1.default.Types.ObjectId(establishmentId);
        const pipeline = [
            { $match: { status: { $in: ["paid", "confirmed"] } } },
            {
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "event",
                },
            },
            { $unwind: "$event" },
            { $match: { "event.organizer.establishment": estId } },
            {
                $addFields: {
                    extrasTotal: {
                        $cond: [{ $isArray: "$extras" }, { $sum: "$extras.price" }, 0],
                    },
                },
            },
            {
                $addFields: {
                    ticketAmount: {
                        $add: [
                            { $multiply: ["$price", "$quantity"] },
                            { $ifNull: ["$extrasTotal", 0] },
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: "$event._id",
                    title: { $first: "$event.title" },
                    date: { $first: "$event.startingDate" },
                    ticketsCount: { $sum: "$quantity" },
                    registrationsCount: { $sum: 1 },
                    totalAmount: { $sum: "$ticketAmount" },
                },
            },
            {
                $group: {
                    _id: null,
                    establishment: { $first: estId },
                    events: {
                        $push: {
                            eventId: "$_id",
                            title: "$title",
                            date: "$date",
                            ticketsCount: "$ticketsCount",
                            registrationsCount: "$registrationsCount",
                            totalAmount: "$totalAmount",
                        },
                    },
                    totalTickets: { $sum: "$ticketsCount" },
                    totalRegistrations: { $sum: "$registrationsCount" },
                    totalAmount: { $sum: "$totalAmount" },
                },
            },
            {
                $project: {
                    _id: 0,
                    establishment: 1,
                    totalTickets: 1,
                    totalRegistrations: 1,
                    totalAmount: 1,
                    events: 1,
                },
            },
        ];
        const stats = yield Registration_1.default.aggregate(pipeline);
        const establishment = yield Establishment_1.default.findById(establishmentId).lean();
        if (!stats || stats.length === 0) {
            return res.json({
                establishment: establishmentId,
                totalTickets: 0,
                totalRegistrations: 0,
                totalAmount: 0,
                amountAvailable: (_a = establishment === null || establishment === void 0 ? void 0 : establishment.amountAvailable) !== null && _a !== void 0 ? _a : 0,
                events: [],
            });
        }
        return res.json(Object.assign(Object.assign({}, stats[0]), { amountAvailable: (_b = establishment === null || establishment === void 0 ? void 0 : establishment.amountAvailable) !== null && _b !== void 0 ? _b : 0 }));
    }
    catch (err) {
        Retour_1.default.error(`getTicketsStatsByEstablishment error: ${err} `);
        return res.status(500).json({ message: "Server error" });
    }
});
const removeUndefined = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
const extractPublicId = (url) => {
    try {
        const parts = url.split("/");
        const uploadIndex = parts.findIndex((p) => p === "upload") + 1;
        const publicIdWithExt = parts.slice(uploadIndex).join("/");
        return publicIdWithExt.replace(/\.[^/.]+$/, "");
    }
    catch (_a) {
        return null;
    }
};
const updateEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { establishmentId } = req.params;
        const updates = Object.assign({}, (req.body || {}));
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        ["openingHours", "address", "staff"].forEach((key) => {
            if (typeof updates[key] === "string") {
                try {
                    updates[key] = JSON.parse(updates[key]);
                }
                catch (err) {
                    console.warn(`[updateEstablishment] parsing error for ${key}`, err);
                }
            }
        });
        const files = (_a = req.files) === null || _a === void 0 ? void 0 : _a.photos;
        if (files && files.length > 0) {
            const folderName = (0, slugify_1.default)(establishment.name, {
                lower: true,
                strict: true,
            });
            if (Array.isArray(establishment.photos) && establishment.photos.length) {
                for (const url of establishment.photos) {
                    const publicId = extractPublicId(url);
                    if (publicId) {
                        try {
                            yield cloudinary.uploader.destroy(publicId);
                        }
                        catch (e) {
                            console.warn("[updateEstablishment] cloudinary destroy error", e);
                        }
                    }
                }
            }
            const uploadedUrls = [];
            for (const file of files) {
                const result = yield cloudinary.uploader.upload(file.path, {
                    folder: `establishments/${folderName}`,
                });
                uploadedUrls.push(result.secure_url);
            }
            establishment.photos = uploadedUrls;
        }
        if (updates.address &&
            typeof updates.address === "object" &&
            updates.address.street &&
            updates.address.city &&
            updates.address.postalCode) {
            const { street, city, postalCode } = updates.address;
            const fullAddress = `${street}, ${postalCode} ${city}`;
            try {
                const { data } = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`);
                if (((_b = data === null || data === void 0 ? void 0 : data.features) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    const [lng, lat] = data.features[0].geometry.coordinates;
                    establishment.location = { lat, lng };
                    const context = data.features[0].properties.context || "";
                    const parts = context.split(",").map((s) => s.trim());
                    const department = parts[1] || "";
                    const region = parts[2] || "";
                    establishment.address = Object.assign(Object.assign({}, (establishment.address || {})), { street,
                        city,
                        postalCode,
                        department,
                        region, country: "France" });
                }
            }
            catch (err) {
                console.warn("[updateEstablishment] api-adresse error:", err);
            }
        }
        const staffPayload = updates.staff;
        delete updates.staff;
        for (const key in updates) {
            const value = updates[key];
            if (typeof value === "object" &&
                !Array.isArray(value) &&
                value !== null) {
                const cleanValue = removeUndefined(value);
                establishment[key] = Object.assign(Object.assign({}, ((_c = establishment[key]) !== null && _c !== void 0 ? _c : {})), cleanValue);
            }
            else {
                establishment[key] = value;
            }
        }
        if (staffPayload !== undefined) {
            const toObjectIds = (input) => {
                const arr = Array.isArray(input) ? input : [input];
                return arr
                    .map((v) => (typeof v === "string" ? v.trim() : v))
                    .filter((v) => mongoose_1.default.isValidObjectId(v))
                    .map((v) => new mongoose_1.default.Types.ObjectId(v));
            };
            const ensureExistingCustomers = (ids) => __awaiter(void 0, void 0, void 0, function* () {
                if (!ids.length)
                    return [];
                const existing = yield Customer_1.default.find({ _id: { $in: ids } }).select("_id");
                const keep = new Set(existing.map((d) => String(d._id)));
                return ids.filter((id) => keep.has(String(id)));
            });
            const uniq = (ids) => {
                const seen = new Set();
                const out = [];
                for (const id of ids) {
                    const s = String(id);
                    if (!seen.has(s)) {
                        seen.add(s);
                        out.push(id);
                    }
                }
                return out;
            };
            const current = Array.isArray(establishment.staff)
                ? establishment.staff.map((id) => new mongoose_1.default.Types.ObjectId(id))
                : [];
            const currentSet = new Set(current.map(String));
            if (Array.isArray(staffPayload) || Array.isArray(staffPayload === null || staffPayload === void 0 ? void 0 : staffPayload.set)) {
                const targetRaw = Array.isArray(staffPayload)
                    ? staffPayload
                    : staffPayload.set;
                const targetIds = uniq(yield ensureExistingCustomers(toObjectIds(targetRaw)));
                const targetSet = new Set(targetIds.map(String));
                const toRemove = current.filter((id) => !targetSet.has(String(id)));
                const toAdd = targetIds.filter((id) => !currentSet.has(String(id)));
                establishment.staff = targetIds;
                if (toRemove.length) {
                    yield Customer_1.default.updateMany({ _id: { $in: toRemove } }, { $pull: { establishmentStaffOf: establishment._id } });
                }
                if (toAdd.length) {
                    yield Customer_1.default.updateMany({ _id: { $in: toAdd } }, { $addToSet: { establishmentStaffOf: establishment._id } });
                }
            }
            else if (staffPayload && typeof staffPayload === "object") {
                if (Array.isArray(staffPayload.add)) {
                    const addIds = uniq(yield ensureExistingCustomers(toObjectIds(staffPayload.add)));
                    establishment.staff = uniq([...current, ...addIds]);
                    if (addIds.length) {
                        yield Customer_1.default.updateMany({ _id: { $in: addIds } }, { $addToSet: { establishmentStaffOf: establishment._id } });
                    }
                }
                if (Array.isArray(staffPayload.remove)) {
                    const removeIds = uniq(yield ensureExistingCustomers(toObjectIds(staffPayload.remove)));
                    const removeSet = new Set(removeIds.map(String));
                    establishment.staff = current.filter((id) => !removeSet.has(String(id)));
                    if (removeIds.length) {
                        yield Customer_1.default.updateMany({ _id: { $in: removeIds } }, { $pull: { establishmentStaffOf: establishment._id } });
                    }
                }
            }
            else {
                console.warn("[updateEstablishment] 'staff' doit être un tableau ou { add/remove/set }.");
            }
        }
        const saved = yield establishment.save();
        const populated = yield Establishment_1.default.findById(saved._id).populate("staff", "email account picture");
        return res.status(200).json(populated);
    }
    catch (error) {
        console.error("[updateEstablishment] error:", error);
        return res.status(500).json({ error: "Failed to update establishment" });
    }
});
const requestActivation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const requesterOwnerId = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.ownerId) || ((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.owner) === null || _c === void 0 ? void 0 : _c._id);
        if (!requesterOwnerId ||
            !mongoose_1.default.isValidObjectId(String(requesterOwnerId))) {
            return res.status(401).json({
                message: "Owner introuvable (auth).",
                action: "OWNER_AUTH_REQUIRED",
            });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const ownersArr = Array.isArray(establishment.owner)
            ? establishment.owner
            : establishment.owner
                ? [establishment.owner]
                : [];
        const isOwner = ownersArr.some((id) => String(id) === String(requesterOwnerId));
        if (!isOwner) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (establishment.activated) {
            return res.status(409).json({
                message: "Establishment already activated",
                activated: true,
            });
        }
        const nameOk = !!String(establishment.name || "").trim();
        const phoneOk = !!String(establishment.phone ||
            ((_d = establishment === null || establishment === void 0 ? void 0 : establishment.contact) === null || _d === void 0 ? void 0 : _d.phone) ||
            "").trim();
        const hasKBis = !!((_f = (_e = establishment === null || establishment === void 0 ? void 0 : establishment.legalInfo) === null || _e === void 0 ? void 0 : _e.KBis) === null || _f === void 0 ? void 0 : _f.secure_url);
        const hasAssoDoc = !!((_h = (_g = establishment === null || establishment === void 0 ? void 0 : establishment.legalInfo) === null || _g === void 0 ? void 0 : _g.legalDocument) === null || _h === void 0 ? void 0 : _h.secure_url);
        const docOk = hasKBis || hasAssoDoc;
        const missing = [];
        if (!nameOk)
            missing.push("name");
        if (!phoneOk)
            missing.push("phone");
        if (!docOk)
            missing.push("legalDoc");
        if (missing.length) {
            return res.status(400).json({
                message: "Activation request rejected: missing required fields",
                missing,
            });
        }
        establishment.activationRequested = true;
        establishment.activationRequestedAt = new Date();
        establishment.activationStatus = "pending";
        establishment.activationReviewedAt = null;
        establishment.activationReviewedBy = null;
        yield establishment.save();
        const owner = yield Owner_1.default.findById(requesterOwnerId);
        (0, notifyAdmins_1.notifyAdminsActivationRequest)({
            establishmentId: String(establishment._id),
            establishmentName: String(establishment.name || "—"),
            legalForm: (establishment.legalForm || "company"),
            ownerId: String(requesterOwnerId),
            ownerFirstname: ((_j = owner === null || owner === void 0 ? void 0 : owner.account) === null || _j === void 0 ? void 0 : _j.firstname) || "—",
            ownerName: ((_k = owner === null || owner === void 0 ? void 0 : owner.account) === null || _k === void 0 ? void 0 : _k.name) || "—",
        }).catch((e) => console.error("Admin notification failed:", e));
        Retour_1.default.info("Activation requested successfully");
        return res.status(200).json({
            message: "Activation requested successfully",
            activationRequested: true,
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`requestActivation error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            message: "Failed to request activation",
            details: (error === null || error === void 0 ? void 0 : error.message) || String(error),
        });
    }
});
const uploadLegalDoc = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const requesterOwnerId = (req === null || req === void 0 ? void 0 : req.ownerId) ||
            ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id) ||
            ((_c = (_b = req === null || req === void 0 ? void 0 : req.body) === null || _b === void 0 ? void 0 : _b.owner) === null || _c === void 0 ? void 0 : _c._id);
        if (!requesterOwnerId) {
            return res.status(401).json({ message: "Unauthorized: missing owner" });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const ownersArr = Array.isArray(establishment.owner)
            ? establishment.owner
            : establishment.owner
                ? [establishment.owner]
                : [];
        const isOwner = ownersArr.some((id) => String(id) === String(requesterOwnerId));
        if (!isOwner) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const fileArr = req.files ? Object(req.files).photos : [];
        const hasFile = Array.isArray(fileArr) && fileArr.length > 0;
        if (!hasFile) {
            return res.status(400).json({ message: "No file provided" });
        }
        const legalForm = String(((_d = req.body) === null || _d === void 0 ? void 0 : _d.legalForm) || establishment.legalForm || "company");
        const isAssociation = legalForm === "association";
        const owner = yield Owner_1.default.findById(requesterOwnerId);
        const cloudinaryFolder = owner
            ? `${owner.account.firstname}_${owner.account.name}_folder`
            : `owners/${String(requesterOwnerId)}`;
        const result = yield cloudinary.v2.uploader.upload(fileArr[0].path, {
            folder: cloudinaryFolder,
            public_id: isAssociation ? "AssociationDocument" : "KBis",
            resource_type: "auto",
        });
        const uploadResult = {
            public_id: result.public_id,
            secure_url: result.secure_url,
        };
        establishment.legalInfo = establishment.legalInfo || {};
        if (isAssociation) {
            establishment.legalInfo.legalDocument = {
                public_id: uploadResult.public_id,
                secure_url: uploadResult.secure_url,
                label: "Statuts / Récépissé",
            };
        }
        else {
            establishment.legalInfo.KBis = {
                public_id: uploadResult.public_id,
                secure_url: uploadResult.secure_url,
            };
        }
        yield establishment.save();
        Retour_1.default.info("Legal doc uploaded");
        return res.status(200).json({
            message: "Legal doc uploaded",
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`uploadLegalDoc error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            message: "Failed to upload legal doc",
            details: (error === null || error === void 0 ? void 0 : error.message) || String(error),
        });
    }
});
const approveActivation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const adminId = (req === null || req === void 0 ? void 0 : req.adminId) || ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id) || null;
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment)
            return res.status(404).json({ message: "Establishment not found" });
        establishment.activated = true;
        establishment.activationStatus = "approved";
        establishment.activationReviewedAt = new Date();
        establishment.activationReviewedBy = adminId;
        yield establishment.save();
        return res.status(200).json({
            message: "Activation approved",
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`approveActivation error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to approve activation" });
    }
});
const rejectActivation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const adminId = (req === null || req === void 0 ? void 0 : req.adminId) || ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id) || null;
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment)
            return res.status(404).json({ message: "Establishment not found" });
        establishment.activated = false;
        establishment.activationStatus = "rejected";
        establishment.activationReviewedAt = new Date();
        establishment.activationReviewedBy = adminId;
        yield establishment.save();
        return res.status(200).json({
            message: "Activation rejected",
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`rejectActivation error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({ message: "Failed to reject activation" });
    }
});
const deleteEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedEstablishment = yield Establishment_1.default.findByIdAndDelete(id);
        if (!deletedEstablishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        yield Owner_1.default.updateOne({ establishments: id }, { $pull: { establishments: id } });
        return res.status(200).json({ message: "Establishment deleted" });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to delete establishment" });
    }
});
exports.default = {
    createEstablishment,
    getAllInformation,
    getPublicInformation,
    trackEstablishmentQrScan,
    getTicketsStatsByEstablishment,
    updateEstablishment,
    requestActivation,
    uploadLegalDoc,
    approveActivation,
    rejectActivation,
    deleteEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFFcEIsc0RBQThCO0FBQzlCLHdEQUEyQztBQUMzQywwRUFBa0Q7QUFDbEQsa0VBQTBDO0FBQzFDLDhEQUFzQztBQUN0QywyREFHa0M7QUFFbEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXpDLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBYSxFQUFpQixFQUFFO0lBQ3BELElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUMxQixXQUFXLEVBQUU7U0FDYixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztTQUNuQixPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLE9BQU8sQ0FBQztJQUM3QyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQUUsT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ2xELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDaEUsTUFBTSxFQUNKLFFBQVEsRUFDUixPQUFPLEVBQ1AsUUFBUSxFQUNSLFNBQVMsRUFDVCxPQUFPLEVBQ1AsV0FBVyxFQUNYLE9BQU8sRUFDUCxLQUFLLEVBQ0wsR0FBRyxFQUNILE1BQU0sRUFDTixJ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