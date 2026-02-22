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
    const { activity, website, facebook, instagram, twitter, adressLabel, society, siret, rna, adress, city, zip, activityCodeNAF, legalForm, owner: ownerId, } = req.body;
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
        const owner = yield Owner_1.default.findById(ownerId);
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
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const requesterOwnerId = req === null || req === void 0 ? void 0 : req.owner._id;
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
            ((_a = establishment === null || establishment === void 0 ? void 0 : establishment.contact) === null || _a === void 0 ? void 0 : _a.phone) ||
            "").trim();
        const hasKBis = !!((_c = (_b = establishment === null || establishment === void 0 ? void 0 : establishment.legalInfo) === null || _b === void 0 ? void 0 : _b.KBis) === null || _c === void 0 ? void 0 : _c.secure_url);
        const hasAssoDoc = !!((_e = (_d = establishment === null || establishment === void 0 ? void 0 : establishment.legalInfo) === null || _d === void 0 ? void 0 : _d.legalDocument) === null || _e === void 0 ? void 0 : _e.secure_url);
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
            ownerFirstname: ((_f = owner === null || owner === void 0 ? void 0 : owner.account) === null || _f === void 0 ? void 0 : _f.firstname) || "—",
            ownerName: ((_g = owner === null || owner === void 0 ? void 0 : owner.account) === null || _g === void 0 ? void 0 : _g.name) || "—",
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
    getTicketsStatsByEstablishment,
    updateEstablishment,
    requestActivation,
    uploadLegalDoc,
    approveActivation,
    rejectActivation,
    deleteEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFFcEIsc0RBQThCO0FBQzlCLHdEQUEyQztBQUMzQywwRUFBa0Q7QUFDbEQsa0VBQTBDO0FBQzFDLDJEQUdrQztBQUVsQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFekMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFhLEVBQWlCLEVBQUU7SUFDcEQsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQzFCLFdBQVcsRUFBRTtTQUNiLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0IsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sT0FBTyxDQUFDO0lBQzdDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7SUFDbEQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUM7QUFFRixNQUFNLG1CQUFtQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNoRSxNQUFNLEVBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxRQUFRLEVBQ1IsU0FBUyxFQUNULE9BQU8sRUFDUCxXQUFXLEVBQ1gsT0FBTyxFQUNQLEtBQUssRUFDTCxHQUFHLEVBQ0gsTUFBTSxFQUNOLElBQUksRUFDSixHQUFH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