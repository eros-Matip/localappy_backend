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
        console.log("ownerFromMiddleware", ownerFromMiddleware === null || ownerFromMiddleware === void 0 ? void 0 : ownerFromMiddleware._id);
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
                source: "qrcode",
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
                source: "qrcode",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFFcEIsc0RBQThCO0FBQzlCLHdEQUEyQztBQUMzQywwRUFBa0Q7QUFDbEQsa0VBQTBDO0FBQzFDLDhEQUFzQztBQUN0QywyREFHa0M7QUFFbEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXpDLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBYSxFQUFpQixFQUFFO0lBQ3BELElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUMxQixXQUFXLEVBQUU7U0FDYixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztTQUNuQixPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLE9BQU8sQ0FBQztJQUM3QyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQUUsT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ2xELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDaEUsTUFBTSxFQUNKLFFBQVEsRUFDUixPQUFPLEVBQ1AsUUFBUSxFQUNSLFNBQVMsRUFDVCxPQUFPLEVBQ1AsV0FBVyxFQUNYLE9BQU8sRUFDUCxLQUFLLEVBQ0wsR0FBRyxFQUNILE1BQU0sRUFDTixJQUFJLEVBQ0osR0FBRyxFQUNILGVBQWUsRUFDZixTQUFTLEdBQ1YsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO0lBRWIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsQ0FBQztJQUM1QyxNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssYUFBYSxDQUFDO0lBRzdDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN0RSxnQkFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFHRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxnQkFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO1FBQzFFLENBQUM7SUFDSCxDQUFDO1NBQU0sQ0FBQztRQUNOLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixnQkFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ25DLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFDTCxtRUFBbUU7YUFDdEUsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFHRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ25FLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFFN0QsSUFBSSxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsR0FBSSxHQUFXLENBQUMsS0FBSyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLGFBQW5CLG1CQUFtQix1QkFBbkIsbUJBQW1CLENBQUUsR0FBRyxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLENBQUEsbUJBQW1CLGFBQW5CLG1CQUFtQix1QkFBbkIsbUJBQW1CLENBQUUsR0FBRyxDQUFBLEVBQUUsQ0FBQztZQUM5QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUM7UUFFbEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMvQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBR0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixnQkFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ2xDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSwwQkFBMEI7Z0JBQ25DLE1BQU0sRUFBRSx1QkFBdUI7YUFDaEMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUdELE1BQU0sZUFBZSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDckMsOENBQThDLGtCQUFrQixDQUM5RCxXQUFXLENBQ1osRUFBRSxDQUNKLENBQUM7UUFFRixJQUFJLENBQUMsQ0FBQSxNQUFBLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSwwQ0FBRSxNQUFNLENBQUEsRUFBRSxDQUFDO1lBQzNDLGdCQUFNLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUM7WUFDdEQsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRzNFLElBQUksWUFBWSxHQUFxRCxJQUFJLENBQUM7UUFFMUUsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNaLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksU0FBUyxDQUFDO1lBRW5GLE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ2xFLE1BQU0sRUFBRSxnQkFBZ0I7Z0JBQ3hCLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxNQUFNO2dCQUN6RCxhQUFhLEVBQUUsTUFBTTthQUN0QixDQUFDLENBQUM7WUFFSCxZQUFZLEdBQUc7Z0JBQ2IsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUMzQixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7YUFDOUIsQ0FBQztRQUNKLENBQUM7UUFHRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDM0MsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRTthQUN4QyxDQUFDLENBQUM7WUFFSCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNiLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBR3JDLE1BQU0sa0JBQWtCLEdBQVMsUUFBZ0IsQ0FBQyxLQUFLLENBQUM7Z0JBQ3hELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7b0JBQ3ZELENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxVQUFVLENBQUM7b0JBQ2pFLENBQUMsQ0FBQyxrQkFBa0I7d0JBQ2xCLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBSyxVQUFVO3dCQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUVaLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3BCLGdCQUFNLENBQUMsSUFBSSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7b0JBQ2xFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBQzFCLE9BQU8sRUFBRSw0Q0FBNEM7d0JBQ3JELGFBQWEsRUFBRSxRQUFRO3dCQUN2QixTQUFTLEVBQUcsUUFBZ0IsQ0FBQyxTQUFTO3dCQUN0QyxhQUFhLEVBQ1gsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLE1BQUMsUUFBZ0IsYUFBaEIsUUFBUSx1QkFBUixRQUFRLENBQVUsU0FBUywwQ0FBRSxJQUFJLENBQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO3dCQUNoRSxZQUFZLEVBQUUsTUFBTTtxQkFDckIsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBR0QsTUFBTSxVQUFVLEdBQVUsQ0FBRSxLQUFhLENBQUMsY0FBYztvQkFDdEQsRUFBRSxDQUFVLENBQUM7Z0JBQ2YsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FDcEMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxNQUFNLENBQUUsUUFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FDMUQsQ0FBQztnQkFFRixJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNuQixnQkFBTSxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO29CQUNoRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUMxQixPQUFPLEVBQUUscURBQXFEO3dCQUM5RCxhQUFhLEVBQUUsUUFBUTt3QkFDdkIsTUFBTSxFQUFFLFNBQVM7cUJBQ2xCLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2hCLFFBQWdCLENBQUMsU0FBUyxHQUFJLFFBQWdCLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztvQkFFaEUsSUFBSSxDQUFDLENBQUEsTUFBQyxRQUFnQixhQUFoQixRQUFRLHVCQUFSLFFBQVEsQ0FBVSxTQUFTLDBDQUFFLElBQUksQ0FBQSxFQUFFLENBQUM7d0JBQ3ZDLFFBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRzs0QkFDakMsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTOzRCQUNqQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7eUJBQ3BDLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO2dCQUdBLFFBQWdCLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO2dCQUM1QyxRQUFnQixDQUFDLHFCQUFxQixHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ3BELFFBQWdCLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO2dCQUM5QyxRQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFHckIsS0FBYSxDQUFDLGNBQWMsR0FBSSxLQUFhLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQztnQkFDbkUsS0FBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUUsUUFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBR25CLElBQUEsMkNBQTRCLEVBQUM7b0JBQzNCLGVBQWUsRUFBRSxNQUFNLENBQUUsUUFBZ0IsQ0FBQyxHQUFHLENBQUM7b0JBQzlDLGlCQUFpQixFQUFHLFFBQWdCLENBQUMsSUFBSSxJQUFJLE9BQU87b0JBQ3BELFNBQVMsRUFBRSxTQUFTO29CQUNwQixPQUFPLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7b0JBQzFCLGNBQWMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVM7b0JBQ3ZDLFNBQVMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUk7aUJBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFaEUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLE1BQUMsUUFBZ0IsYUFBaEIsUUFBUSx1QkFBUixRQUFRLENBQVUsU0FBUywwQ0FBRSxJQUFJLENBQUEsQ0FBQztnQkFFdEUsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsNENBQTRDLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDMUIsT0FBTyxFQUFFLHNEQUFzRDtvQkFDL0QsYUFBYSxFQUFFLFFBQVE7b0JBQ3ZCLE1BQU0sRUFBRSxTQUFTO29CQUNqQixTQUFTLEVBQUcsUUFBZ0IsQ0FBQyxTQUFTO29CQUN0QyxhQUFhO29CQUNiLFlBQVksRUFBRSxNQUFNO2lCQUNyQixDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFFLENBQUM7WUFDbkMsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDM0MsU0FBUyxFQUFFLGFBQWE7Z0JBQ3hCLGVBQWUsRUFBRSxPQUFPO2FBQ3pCLENBQUMsQ0FBQztZQUVILElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFHckMsTUFBTSxrQkFBa0IsR0FBUyxRQUFnQixDQUFDLEtBQUssQ0FBQztnQkFDeEQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztvQkFDdkQsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLFVBQVUsQ0FBQztvQkFDakUsQ0FBQyxDQUFDLGtCQUFrQjt3QkFDbEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLFVBQVU7d0JBQzNDLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBRVosSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDcEIsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztvQkFDaEUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFDMUIsT0FBTyxFQUFFLDRDQUE0Qzt3QkFDckQsYUFBYSxFQUFFLFFBQVE7d0JBQ3ZCLFNBQVMsRUFBRyxRQUFnQixDQUFDLFNBQVM7d0JBQ3RDLGFBQWEsRUFDWCxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsTUFBQyxRQUFnQixhQUFoQixRQUFRLHVCQUFSLFFBQVEsQ0FBVSxTQUFTLDBDQUFFLGFBQWEsQ0FBQTs0QkFDdEQsQ0FBQyxDQUFDLElBQUk7NEJBQ04sQ0FBQyxDQUFDLEtBQUs7d0JBQ1gsWUFBWSxFQUFFLGlCQUFpQjtxQkFDaEMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBR0QsTUFBTSxVQUFVLEdBQVUsQ0FBRSxLQUFhLENBQUMsY0FBYztvQkFDdEQsRUFBRSxDQUFVLENBQUM7Z0JBQ2YsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FDcEMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxNQUFNLENBQUUsUUFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FDMUQsQ0FBQztnQkFFRixJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNuQixnQkFBTSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO29CQUM5RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUMxQixPQUFPLEVBQUUscURBQXFEO3dCQUM5RCxhQUFhLEVBQUUsUUFBUTt3QkFDdkIsTUFBTSxFQUFFLFNBQVM7cUJBQ2xCLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2hCLFFBQWdCLENBQUMsU0FBUyxHQUFJLFFBQWdCLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztvQkFFaEUsSUFBSSxDQUFDLENBQUEsTUFBQyxRQUFnQixhQUFoQixRQUFRLHVCQUFSLFFBQVEsQ0FBVSxTQUFTLDBDQUFFLGFBQWEsQ0FBQSxFQUFFLENBQUM7d0JBQ2hELFFBQWdCLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBRzs0QkFDMUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTOzRCQUNqQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7NEJBQ25DLEtBQUssRUFBRSxxQkFBcUI7eUJBQzdCLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO2dCQUdBLFFBQWdCLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO2dCQUM1QyxRQUFnQixDQUFDLHFCQUFxQixHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ3BELFFBQWdCLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO2dCQUM5QyxRQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFHckIsS0FBYSxDQUFDLGNBQWMsR0FBSSxLQUFhLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQztnQkFDbkUsS0FBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUUsUUFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBR25CLElBQUEsMkNBQTRCLEVBQUM7b0JBQzNCLGVBQWUsRUFBRSxNQUFNLENBQUUsUUFBZ0IsQ0FBQyxHQUFHLENBQUM7b0JBQzlDLGlCQUFpQixFQUFHLFFBQWdCLENBQUMsSUFBSSxJQUFJLE9BQU87b0JBQ3BELFNBQVMsRUFBRSxhQUFhO29CQUN4QixPQUFPLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7b0JBQzFCLGNBQWMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVM7b0JBQ3ZDLFNBQVMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUk7aUJBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFaEUsTUFBTSxhQUFhLEdBQ2pCLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxNQUFDLFFBQWdCLGFBQWhCLFFBQVEsdUJBQVIsUUFBUSxDQUFVLFNBQVMsMENBQUUsYUFBYSxDQUFBLENBQUM7Z0JBRTNELGdCQUFNLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLENBQUM7Z0JBQ3hELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzFCLE9BQU8sRUFBRSxzREFBc0Q7b0JBQy9ELGFBQWEsRUFBRSxRQUFRO29CQUN2QixNQUFNLEVBQUUsU0FBUztvQkFDakIsU0FBUyxFQUFHLFFBQWdCLENBQUMsU0FBUztvQkFDdEMsYUFBYTtvQkFDYixZQUFZLEVBQUUsaUJBQWlCO2lCQUNoQyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUdELE1BQU0sYUFBYSxHQUFHLElBQUksdUJBQWEsQ0FBQztZQUN0QyxJQUFJLEVBQUUsT0FBTztZQUNiLElBQUksRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQ3JELFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUVwRCxPQUFPLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsSUFBSTtnQkFDSixVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsUUFBUTthQUNsQjtZQUVELFFBQVEsRUFBRTtnQkFDUixHQUFHLEVBQUUsUUFBUTtnQkFDYixHQUFHLEVBQUUsU0FBUzthQUNmO1lBRUQsT0FBTyxFQUFFO2dCQUNQLE9BQU87Z0JBQ1AsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7YUFDOUM7WUFFRCxTQUFTLEVBQUU7Z0JBRVQsS0FBSyxFQUFFLENBQUMsYUFBYTtvQkFDbkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUU7b0JBQ3RCLENBQUMsQ0FBQyxLQUFLO3dCQUNMLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFO3dCQUN0QixDQUFDLENBQUMsU0FBUztnQkFFZixJQUFJLEVBQ0YsQ0FBQyxhQUFhLElBQUksWUFBWTtvQkFDNUIsQ0FBQyxDQUFDO3dCQUNFLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUzt3QkFDakMsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO3FCQUNwQztvQkFDSCxDQUFDLENBQUMsU0FBUztnQkFHZixHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBRW5ELGFBQWEsRUFDWCxhQUFhLElBQUksWUFBWTtvQkFDM0IsQ0FBQyxDQUFDO3dCQUNFLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUzt3QkFDakMsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO3dCQUNuQyxLQUFLLEVBQUUscUJBQXFCO3FCQUM3QjtvQkFDSCxDQUFDLENBQUMsU0FBUztnQkFFZixlQUFlLEVBQUUsZUFBZSxJQUFJLFNBQVM7YUFDOUM7WUFHRCxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBRWxCLE1BQU0sRUFBRSxFQUFFO1lBQ1YsR0FBRyxFQUFFLEVBQUU7WUFDUCxLQUFLLEVBQUUsRUFBRTtZQUdULFNBQVMsRUFBRSxLQUFLO1NBQ2pCLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMzQixLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBRSxhQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBR25CLElBQUEsMkNBQTRCLEVBQUM7WUFDM0IsZUFBZSxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDO1lBQzFDLGlCQUFpQixFQUFFLE9BQU87WUFDMUIsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3BELE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUMxQixjQUFjLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTO1lBQ3ZDLFNBQVMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUk7U0FDOUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sYUFBYSxHQUFHLENBQUMsT0FBTyxDQUFDO1FBRS9CLGdCQUFNLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxDQUFDLENBQUM7UUFDL0QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsb0NBQW9DO1lBQzdDLGFBQWE7WUFFYixTQUFTLEVBQUUsYUFBYSxDQUFDLFNBQVM7WUFDbEMsYUFBYTtZQUNiLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxNQUFNO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN6RSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLEtBQUssRUFBRSxnQ0FBZ0M7WUFDdkMsT0FBTyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLO1NBQ2pDLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQU1GLE1BQU0sV0FBVyxHQUFHLENBQUMsU0FBaUIsRUFBWSxFQUFFO0lBQ2xELElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRXpDLE9BQU8sWUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNoRCxNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLFlBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxPQUFPLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDdEQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixNQUFNLGlCQUFpQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQzlELElBQUksQ0FBQztRQUNILE1BQU0sbUJBQW1CLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FDdEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQzNCLENBQUMsUUFBUSxDQUFDO1lBQ1Q7Z0JBQ0UsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsS0FBSyxFQUFFLFVBQVU7YUFDbEI7WUFDRDtnQkFDRSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxLQUFLLEVBQUUsT0FBTztnQkFDZCxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUU7YUFDeEQ7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBR0QsTUFBTSxlQUFlLEdBQTJCO1lBQzlDLFVBQVUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7WUFDVixVQUFVLEVBQUUsQ0FBQztZQUNiLFlBQVksRUFBRSxDQUFDO1lBQ2YsS0FBSyxFQUFFLENBQUM7U0FDVCxDQUFDO1FBRUYsTUFBTSxNQUFNLEdBQUksbUJBQW1CLENBQUMsTUFBOEIsQ0FBQyxHQUFHLENBQ3BFLENBQUMsR0FBUSxFQUFFLEVBQUU7O1lBRVgsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM3QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDMUIsUUFBUSxNQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxNQUFNLDBDQUFFLFdBQVcsRUFBRSxFQUFFLENBQUM7d0JBQ2pDLEtBQUssWUFBWTs0QkFDZixlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBQzdCLE1BQU07d0JBQ1IsS0FBSyxTQUFTOzRCQUNaLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQzs0QkFDMUIsTUFBTTt3QkFDUixLQUFLLFlBQVk7NEJBQ2YsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDOzRCQUM3QixNQUFNO3dCQUNSLEtBQUssY0FBYzs0QkFFakIsTUFBTTt3QkFDUjs0QkFDRSxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7NEJBQ3hCLE1BQU07b0JBQ1YsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztZQUdELE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDO2dCQUN6RCxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQ3RCLENBQUMsR0FBVyxFQUFFLENBQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsUUFBUSxLQUFJLENBQUMsQ0FBQyxFQUNqRCxDQUFDLENBQ0Y7Z0JBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVOLGVBQWUsQ0FBQyxZQUFZLElBQUksa0JBQWtCLENBQUM7WUFHbkQsTUFBTSxJQUFJLEdBQUcsT0FBTyxHQUFHLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDdkUsdUNBQVksSUFBSSxLQUFFLGtCQUFrQixJQUFHO1FBQ3pDLENBQUMsQ0FDRixDQUFDO1FBRUYsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixhQUFhLEVBQUUsbUJBQW1CO1lBQ2xDLFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTTtZQUMxQixlQUFlO1lBQ2YsTUFBTTtTQUNQLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLEtBQUssRUFDSCxvRUFBb0U7U0FDdkUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxvQkFBb0IsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNqRSxJQUFJLENBQUM7UUFDSCxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUNoRCxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDM0I7YUFDRSxNQUFNLENBQ0wsc0hBQXNILENBQ3ZIO2FBQ0EsUUFBUSxDQUFDO1lBQ1IsSUFBSSxFQUFFLFFBQVE7WUFDZCxLQUFLLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksSUFBSSxFQUFFLEVBQUU7YUFDaEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO2FBQ3pDO1NBQ0YsQ0FBQyxDQUFDO1FBRUwsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0QsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLCtDQUErQyxFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUVwQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTTtZQUMxQixhQUFhO1NBQ2QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixnQkFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLEtBQUssRUFBRSx1REFBdUQ7U0FDL0QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSx3QkFBd0IsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDckUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7UUFFbkQsTUFBTSxFQUFFLEdBQ04sQ0FBQSxNQUFBLE1BQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBWSwwQ0FBRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQywwQ0FBRSxJQUFJLEVBQUU7WUFDakUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhO1lBQ3hCLFNBQVMsQ0FBQztRQUVaLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRzFELElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sZ0JBQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ2xCLGFBQWEsRUFBRSxlQUFlO2dCQUM5QixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLEVBQUU7Z0JBQ0YsU0FBUztnQkFDVCxNQUFNLEVBQUUsUUFBUTthQUNqQixDQUFDLENBQUM7WUFDSCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEMsQ0FBQztRQUdELE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBRW5ELE1BQU0sT0FBTyxHQUFHLE1BQU0sZ0JBQU0sQ0FBQyxPQUFPLENBQUM7WUFDbkMsYUFBYSxFQUFFLGVBQWU7WUFDOUIsRUFBRTtZQUNGLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7U0FDM0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLGdCQUFNLENBQUMsTUFBTSxDQUFDO2dCQUNsQixhQUFhLEVBQUUsZUFBZTtnQkFDOUIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNyQixFQUFFO2dCQUNGLFNBQVM7Z0JBQ1QsTUFBTSxFQUFFLFFBQVE7YUFDakIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLGdCQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzFELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sOEJBQThCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQzNFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBRXZDLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGtCQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUUzRCxNQUFNLFFBQVEsR0FBRztZQUNmLEVBQUUsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUN0RDtnQkFDRSxPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLE9BQU87b0JBQ25CLFlBQVksRUFBRSxLQUFLO29CQUNuQixFQUFFLEVBQUUsT0FBTztpQkFDWjthQUNGO1lBQ0QsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFO1lBQ3JCLEVBQUUsTUFBTSxFQUFFLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDdEQ7Z0JBQ0UsVUFBVSxFQUFFO29CQUNWLFdBQVcsRUFBRTt3QkFDWCxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7cUJBQy9EO2lCQUNGO2FBQ0Y7WUFDRDtnQkFDRSxVQUFVLEVBQUU7b0JBQ1YsWUFBWSxFQUFFO3dCQUNaLElBQUksRUFBRTs0QkFDSixFQUFFLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsRUFBRTs0QkFDdEMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUU7eUJBQ2pDO3FCQUNGO2lCQUNGO2FBQ0Y7WUFDRDtnQkFDRSxNQUFNLEVBQUU7b0JBQ04sR0FBRyxFQUFFLFlBQVk7b0JBQ2pCLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUU7b0JBQ2pDLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRTtvQkFDdkMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTtvQkFDbkMsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO29CQUMvQixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFO2lCQUN2QzthQUNGO1lBQ0Q7Z0JBQ0UsTUFBTSxFQUFFO29CQUNOLEdBQUcsRUFBRSxJQUFJO29CQUNULGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7b0JBQ2hDLE1BQU0sRUFBRTt3QkFDTixLQUFLLEVBQUU7NEJBQ0wsT0FBTyxFQUFFLE1BQU07NEJBQ2YsS0FBSyxFQUFFLFFBQVE7NEJBQ2YsSUFBSSxFQUFFLE9BQU87NEJBQ2IsWUFBWSxFQUFFLGVBQWU7NEJBQzdCLGtCQUFrQixFQUFFLHFCQUFxQjs0QkFDekMsV0FBVyxFQUFFLGNBQWM7eUJBQzVCO3FCQUNGO29CQUNELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUU7b0JBQ3ZDLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFO29CQUNuRCxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFO2lCQUN0QzthQUNGO1lBQ0Q7Z0JBQ0UsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxDQUFDO29CQUNOLGFBQWEsRUFBRSxDQUFDO29CQUNoQixZQUFZLEVBQUUsQ0FBQztvQkFDZixrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixXQUFXLEVBQUUsQ0FBQztvQkFDZCxNQUFNLEVBQUUsQ0FBQztpQkFDVjthQUNGO1NBQ0YsQ0FBQztRQUVGLE1BQU0sS0FBSyxHQUFHLE1BQU8sc0JBQW9CLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlELE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0UsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDZCxhQUFhLEVBQUUsZUFBZTtnQkFDOUIsWUFBWSxFQUFFLENBQUM7Z0JBQ2Ysa0JBQWtCLEVBQUUsQ0FBQztnQkFDckIsV0FBVyxFQUFFLENBQUM7Z0JBQ2QsZUFBZSxFQUFFLE1BQUEsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLGVBQWUsbUNBQUksQ0FBQztnQkFDcEQsTUFBTSxFQUFFLEVBQUU7YUFDWCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsSUFBSSxpQ0FDVixLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQ1gsZUFBZSxFQUFFLE1BQUEsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLGVBQWUsbUNBQUksQ0FBQyxJQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixnQkFBTSxDQUFDLEtBQUssQ0FBQyx5Q0FBeUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUM5RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBSUYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUF3QixFQUFFLEVBQUUsQ0FDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztBQUU5RSxNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQVcsRUFBaUIsRUFBRTtJQUNyRCxJQUFJLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0QsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0QsT0FBTyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBQUMsV0FBTSxDQUFDO1FBQ1AsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDaEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLGVBQWUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDdkMsTUFBTSxPQUFPLHFCQUFhLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBRSxDQUFDO1FBRTdDLE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFHRCxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDO29CQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQywyQ0FBMkMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3RFLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFHSCxNQUFNLEtBQUssR0FBRyxNQUFDLEdBQUcsQ0FBQyxLQUF3RCwwQ0FDdkUsTUFBTSxDQUFDO1FBRVgsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLFVBQVUsR0FBRyxJQUFBLGlCQUFPLEVBQUMsYUFBYSxDQUFDLElBQUksRUFBRTtnQkFDN0MsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsTUFBTSxFQUFFLElBQUk7YUFDYixDQUFDLENBQUM7WUFHSCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZFLEtBQUssTUFBTSxHQUFHLElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN2QyxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3RDLElBQUksUUFBUSxFQUFFLENBQUM7d0JBQ2IsSUFBSSxDQUFDOzRCQUNILE1BQU0sVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQzlDLENBQUM7d0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNwRSxDQUFDO29CQUNILENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFHRCxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7WUFDbEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUN6RCxNQUFNLEVBQUUsa0JBQWtCLFVBQVUsRUFBRTtpQkFDdkMsQ0FBQyxDQUFDO2dCQUNILFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7WUFFRCxhQUFhLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztRQUN0QyxDQUFDO1FBR0QsSUFDRSxPQUFPLENBQUMsT0FBTztZQUNmLE9BQU8sT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRO1lBQ25DLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUN0QixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUk7WUFDcEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQzFCLENBQUM7WUFDRCxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3JELE1BQU0sV0FBVyxHQUFHLEdBQUcsTUFBTSxLQUFLLFVBQVUsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUV2RCxJQUFJLENBQUM7Z0JBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDOUIsOENBQThDLGtCQUFrQixDQUM5RCxXQUFXLENBQ1osVUFBVSxDQUNaLENBQUM7Z0JBRUYsSUFBSSxDQUFBLE1BQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFFBQVEsMENBQUUsTUFBTSxJQUFHLENBQUMsRUFBRSxDQUFDO29CQUMvQixNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztvQkFDekQsYUFBYSxDQUFDLFFBQVEsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztvQkFFdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztvQkFDMUQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUM5RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNsQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUU5QixhQUFhLENBQUMsT0FBTyxtQ0FDaEIsQ0FBQyxhQUFhLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxLQUNoQyxNQUFNO3dCQUNOLElBQUk7d0JBQ0osVUFBVTt3QkFDVixVQUFVO3dCQUNWLE1BQU0sRUFDTixPQUFPLEVBQUUsUUFBUSxHQUNsQixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2hFLENBQUM7UUFDSCxDQUFDO1FBR0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUNuQyxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFHckIsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMxQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFM0IsSUFDRSxPQUFPLEtBQUssS0FBSyxRQUFRO2dCQUN6QixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUNyQixLQUFLLEtBQUssSUFBSSxFQUNkLENBQUM7Z0JBQ0QsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN6QyxhQUFxQixDQUFDLEdBQUcsQ0FBQyxtQ0FDdEIsQ0FBQyxNQUFDLGFBQXFCLENBQUMsR0FBRyxDQUFDLG1DQUFJLEVBQUUsQ0FBQyxHQUNuQyxVQUFVLENBQ2QsQ0FBQztZQUNKLENBQUM7aUJBQU0sQ0FBQztnQkFDTCxhQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUN0QyxDQUFDO1FBQ0gsQ0FBQztRQUtELElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBVSxFQUE2QixFQUFFO2dCQUM1RCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25ELE9BQU8sR0FBRztxQkFDUCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNsRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUMxQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksa0JBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEQsQ0FBQyxDQUFDO1lBRUYsTUFBTSx1QkFBdUIsR0FBRyxDQUM5QixHQUE4QixFQUM5QixFQUFFO2dCQUNGLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTTtvQkFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxRQUFRLEdBQUcsTUFBTSxrQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUNoRSxLQUFLLENBQ04sQ0FBQztnQkFDRixNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEQsQ0FBQyxDQUFBLENBQUM7WUFFRixNQUFNLElBQUksR0FBRyxDQUFDLEdBQThCLEVBQUUsRUFBRTtnQkFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztnQkFDL0IsTUFBTSxHQUFHLEdBQThCLEVBQUUsQ0FBQztnQkFDMUMsS0FBSyxNQUFNLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2YsQ0FBQztnQkFDSCxDQUFDO2dCQUNELE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQyxDQUFDO1lBRUYsTUFBTSxPQUFPLEdBQThCLEtBQUssQ0FBQyxPQUFPLENBQ3RELGFBQWEsQ0FBQyxLQUFLLENBQ3BCO2dCQUNDLENBQUMsQ0FBRSxhQUFhLENBQUMsS0FBZSxDQUFDLEdBQUcsQ0FDaEMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksa0JBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUM3QztnQkFDSCxDQUFDLENBQUMsRUFBRSxDQUFDO1lBRVAsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBR2hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksYUFBWixZQUFZLHVCQUFaLFlBQVksQ0FBRSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztvQkFDM0MsQ0FBQyxDQUFDLFlBQVk7b0JBQ2QsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7Z0JBRXJCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FDcEIsTUFBTSx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FDdEQsQ0FBQztnQkFDRixNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBRWpELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFcEUsYUFBYSxDQUFDLEtBQUssR0FBRyxTQUFnQixDQUFDO2dCQUV2QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDcEIsTUFBTSxrQkFBUSxDQUFDLFVBQVUsQ0FDdkIsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFDMUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxhQUFhLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDdkQsQ0FBQztnQkFDSixDQUFDO2dCQUNELElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNqQixNQUFNLGtCQUFRLENBQUMsVUFBVSxDQUN2QixFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUN2QixFQUFFLFNBQVMsRUFBRSxFQUFFLG9CQUFvQixFQUFFLGFBQWEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUMzRCxDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO2lCQUdJLElBQUksWUFBWSxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUUxRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FDakIsTUFBTSx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQzdELENBQUM7b0JBQ0YsYUFBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE9BQU8sRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFRLENBQUM7b0JBRTNELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUNsQixNQUFNLGtCQUFRLENBQUMsVUFBVSxDQUN2QixFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUN4QixFQUFFLFNBQVMsRUFBRSxFQUFFLG9CQUFvQixFQUFFLGFBQWEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUMzRCxDQUFDO29CQUNKLENBQUM7Z0JBQ0gsQ0FBQztnQkFHRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FDcEIsTUFBTSx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ2hFLENBQUM7b0JBQ0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUVqRCxhQUFhLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQ2xDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzVCLENBQUM7b0JBRVQsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ3JCLE1BQU0sa0JBQVEsQ0FBQyxVQUFVLENBQ3ZCLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQzNCLEVBQUUsS0FBSyxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQ3ZELENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE9BQU8sQ0FBQyxJQUFJLENBQ1YsMkVBQTJFLENBQzVFLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUdELE1BQU0sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1FBR3pDLE1BQU0sU0FBUyxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FDaEUsT0FBTyxFQUNQLHVCQUF1QixDQUN4QixDQUFDO1FBRUYsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0saUJBQWlCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQzlELElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBRXZDLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFHRCxNQUFNLGdCQUFnQixHQUFHLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSwwQ0FBRSxPQUFPLE1BQUksTUFBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLDBDQUFFLEtBQUssMENBQUUsR0FBRyxDQUFBLENBQUM7UUFFbkUsSUFDRSxDQUFDLGdCQUFnQjtZQUNqQixDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQ25ELENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsMkJBQTJCO2dCQUNwQyxNQUFNLEVBQUUscUJBQXFCO2FBQzlCLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBR0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxhQUFxQixDQUFDLEtBQUssQ0FBQztZQUMzRCxDQUFDLENBQUcsYUFBcUIsQ0FBQyxLQUFlO1lBQ3pDLENBQUMsQ0FBRSxhQUFxQixDQUFDLEtBQUs7Z0JBQzVCLENBQUMsQ0FBQyxDQUFFLGFBQXFCLENBQUMsS0FBSyxDQUFDO2dCQUNoQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRVQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FDNUIsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FDckQsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBR0QsSUFBSyxhQUFxQixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxpQ0FBaUM7Z0JBQzFDLFNBQVMsRUFBRSxJQUFJO2FBQ2hCLENBQUMsQ0FBQztRQUNMLENBQUM7UUFHRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFFLGFBQXFCLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xFLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQ3JCLGFBQXFCLENBQUMsS0FBSzthQUMxQixNQUFDLGFBQXFCLGFBQXJCLGFBQWEsdUJBQWIsYUFBYSxDQUFVLE9BQU8sMENBQUUsS0FBSyxDQUFBO1lBQ3RDLEVBQUUsQ0FDTCxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUEsTUFBQSxNQUFDLGFBQXFCLGFBQXJCLGFBQWEsdUJBQWIsYUFBYSxDQUFVLFNBQVMsMENBQUUsSUFBSSwwQ0FBRSxVQUFVLENBQUEsQ0FBQztRQUN0RSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQSxNQUFBLE1BQUMsYUFBcUIsYUFBckIsYUFBYSx1QkFBYixhQUFhLENBQVUsU0FBUywwQ0FBRSxhQUFhLDBDQUNqRSxVQUFVLENBQUEsQ0FBQztRQUNmLE1BQU0sS0FBSyxHQUFHLE9BQU8sSUFBSSxVQUFVLENBQUM7UUFFcEMsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXJDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxzREFBc0Q7Z0JBQy9ELE9BQU87YUFDUixDQUFDLENBQUM7UUFDTCxDQUFDO1FBR0EsYUFBcUIsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDakQsYUFBcUIsQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3pELGFBQXFCLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO1FBQ25ELGFBQXFCLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ2xELGFBQXFCLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBRW5ELE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRzNCLE1BQU0sS0FBSyxHQUFHLE1BQU0sZUFBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXJELElBQUEsNENBQTZCLEVBQUM7WUFDNUIsZUFBZSxFQUFFLE1BQU0sQ0FBRSxhQUFxQixDQUFDLEdBQUcsQ0FBQztZQUNuRCxpQkFBaUIsRUFBRSxNQUFNLENBQUUsYUFBcUIsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDO1lBQzdELFNBQVMsRUFBRSxDQUFFLGFBQXFCLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FFeEM7WUFDakIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUNqQyxjQUFjLEVBQUUsQ0FBQSxNQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLDBDQUFFLFNBQVMsS0FBSSxHQUFHO1lBQ2hELFNBQVMsRUFBRSxDQUFBLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sMENBQUUsSUFBSSxLQUFJLEdBQUc7U0FDdkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhFLGdCQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDakQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsbUNBQW1DO1lBQzVDLG1CQUFtQixFQUFFLElBQUk7WUFDekIsYUFBYTtTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSw4QkFBOEI7WUFDdkMsT0FBTyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ3pDLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sY0FBYyxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUMzRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUV2QyxJQUFJLENBQUMsa0JBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBR0QsTUFBTSxnQkFBZ0IsR0FDcEIsQ0FBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsT0FBTzthQUNyQixNQUFDLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxJQUFJLDBDQUFFLEdBQUcsQ0FBQTthQUN2QixNQUFBLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsS0FBSywwQ0FBRSxHQUFHLENBQUEsQ0FBQztRQUVqQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUdELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUUsYUFBcUIsQ0FBQyxLQUFLLENBQUM7WUFDM0QsQ0FBQyxDQUFHLGFBQXFCLENBQUMsS0FBZTtZQUN6QyxDQUFDLENBQUUsYUFBcUIsQ0FBQyxLQUFLO2dCQUM1QixDQUFDLENBQUMsQ0FBRSxhQUFxQixDQUFDLEtBQUssQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVULE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQzVCLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQ3JELENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUU3RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBR0QsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUN0QixDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksMENBQUUsU0FBUyxLQUFLLGFBQXFCLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FDckUsQ0FBQztRQUNGLE1BQU0sYUFBYSxHQUFHLFNBQVMsS0FBSyxhQUFhLENBQUM7UUFFbEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLO1lBQzVCLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxTQUFTO1lBQzNELENBQUMsQ0FBQyxVQUFVLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7UUFFekMsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUNsRSxNQUFNLEVBQUUsZ0JBQWdCO1lBQ3hCLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxNQUFNO1lBQ3pELGFBQWEsRUFBRSxNQUFNO1NBQ3RCLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHO1lBQ25CLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztZQUMzQixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7U0FDOUIsQ0FBQztRQUdELGFBQXFCLENBQUMsU0FBUyxHQUFJLGFBQXFCLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUUxRSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ2pCLGFBQXFCLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBRztnQkFDL0MsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTO2dCQUNqQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7Z0JBQ25DLEtBQUssRUFBRSxxQkFBcUI7YUFDN0IsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ0wsYUFBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHO2dCQUN0QyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVM7Z0JBQ2pDLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTthQUNwQyxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTNCLGdCQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDbEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLGFBQWE7U0FDZCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixnQkFBTSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDakUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsNEJBQTRCO1lBQ3JDLE9BQU8sRUFBRSxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksTUFBTSxDQUFDLEtBQUssQ0FBQztTQUN6QyxDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixNQUFNLGlCQUFpQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUM5RCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUV2QyxJQUFJLENBQUMsa0JBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsT0FBTyxNQUFJLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsR0FBRyxDQUFBLElBQUksSUFBSSxDQUFDO1FBRXpFLE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLGFBQWE7WUFDaEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFFckUsYUFBcUIsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLGFBQXFCLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO1FBQ3BELGFBQXFCLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN4RCxhQUFxQixDQUFDLG9CQUFvQixHQUFHLE9BQU8sQ0FBQztRQUV0RCxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUUzQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsYUFBYTtTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLENBQUMsQ0FBQztJQUMzRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUM3RCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUV2QyxJQUFJLENBQUMsa0JBQVEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsT0FBTyxNQUFJLE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLElBQUksMENBQUUsR0FBRyxDQUFBLElBQUksSUFBSSxDQUFDO1FBRXpFLE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLGFBQWE7WUFDaEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFFckUsYUFBcUIsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3hDLGFBQXFCLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO1FBQ3BELGFBQXFCLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN4RCxhQUFxQixDQUFDLG9CQUFvQixHQUFHLE9BQU8sQ0FBQztRQUV0RCxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUUzQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsYUFBYTtTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxPQUFPLEtBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNuRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFHRixNQUFNLG1CQUFtQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ2hFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBRzFCLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSx1QkFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFHRCxNQUFNLGVBQUssQ0FBQyxTQUFTLENBQ25CLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxFQUN0QixFQUFFLEtBQUssRUFBRSxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUNsQyxDQUFDO1FBR0YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGdDQUFnQyxFQUFFLENBQUMsQ0FBQztJQUMzRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixrQkFBZTtJQUNiLG1CQUFtQjtJQUNuQixpQkFBaUI7SUFDakIsb0JBQW9CO0lBQ3BCLHdCQUF3QjtJQUN4Qiw4QkFBOEI7SUFFOUIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQixjQUFjO0lBQ2QsaUJBQWlCO0lBQ2pCLGdCQUFnQjtJQUNoQixtQkFBbUI7Q0FDcEIsQ0FBQyJ9