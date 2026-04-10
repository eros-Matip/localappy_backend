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
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
        (_h = establishment === null || establishment === void 0 ? void 0 : establishment.owner) === null || _h === void 0 ? void 0 : _h.push(owner._id);
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
        const allEvents = establishmentFinded.events;
        const eventsWithRegistrationsCount = allEvents.map((evt) => {
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
        const visibleEvents = eventsWithRegistrationsCount.filter((evt) => !evt.deletedAt);
        return res.status(200).json({
            establishment: establishmentFinded,
            totalEvents: visibleEvents.length,
            statsByCategory,
            events: visibleEvents,
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
            const folderName = `establishments/${establishment._id}`;
            const uploadedUrls = [];
            for (const file of files) {
                const result = yield cloudinary.uploader.upload(file.path, {
                    folder: folderName,
                });
                uploadedUrls.push(result.secure_url);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFHcEIsd0RBQTJDO0FBQzNDLDBFQUFrRDtBQUNsRCxrRUFBMEM7QUFDMUMsOERBQXNDO0FBQ3RDLDJEQUdrQztBQUVsQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFekMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFhLEVBQWlCLEVBQUU7SUFDcEQsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQzFCLFdBQVcsRUFBRTtTQUNiLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0IsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sT0FBTyxDQUFDO0lBQzdDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7SUFDbEQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUM7QUFFRixNQUFNLG1CQUFtQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNoRSxNQUFNLEVBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxRQUFRLEVBQ1IsU0FBUyxFQUNULE9BQU8sRUFDUCxXQUFXLEVBQ1gsT0FBTyxFQUNQLEtBQUssRUFDTCxHQUFHLEVBQ0gsTUFBTSxFQUNOLElBQUksRUFDSixHQUFH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