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
                const pendingArr = (owner.establishmentsPending ||
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
                owner.establishmentsPending =
                    owner.establishmentsPending || [];
                owner.establishmentsPending.push(existing._id);
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
                return res.status(202).json({
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
                const pendingArr = (owner.establishmentsPending ||
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
                owner.establishmentsPending =
                    owner.establishmentsPending || [];
                owner.establishmentsPending.push(existing._id);
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
                return res.status(202).json({
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
            owner: owner._id,
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    try {
        const { establishmentId } = req.params;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishment id" });
        }
        const requesterOwnerId = (req === null || req === void 0 ? void 0 : req.ownerId) ||
            ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.ownerId) ||
            ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id) ||
            ((_d = (_c = req === null || req === void 0 ? void 0 : req.customer) === null || _c === void 0 ? void 0 : _c.ownerAccount) === null || _d === void 0 ? void 0 : _d.ownerId) ||
            ((_f = (_e = req === null || req === void 0 ? void 0 : req.customer) === null || _e === void 0 ? void 0 : _e.ownerAccount) === null || _f === void 0 ? void 0 : _f._id) ||
            ((_g = req.body) === null || _g === void 0 ? void 0 : _g.ownerId) ||
            ((_h = req.body) === null || _h === void 0 ? void 0 : _h.owner);
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
        if (String(establishment.owner) !== String(requesterOwnerId)) {
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
            ((_j = establishment === null || establishment === void 0 ? void 0 : establishment.contact) === null || _j === void 0 ? void 0 : _j.phone) ||
            "").trim();
        const hasKBis = !!((_l = (_k = establishment === null || establishment === void 0 ? void 0 : establishment.legalInfo) === null || _k === void 0 ? void 0 : _k.KBis) === null || _l === void 0 ? void 0 : _l.secure_url);
        const hasAssoDoc = !!((_o = (_m = establishment === null || establishment === void 0 ? void 0 : establishment.legalInfo) === null || _m === void 0 ? void 0 : _m.legalDocument) === null || _o === void 0 ? void 0 : _o.secure_url);
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
            ownerFirstname: ((_p = owner === null || owner === void 0 ? void 0 : owner.account) === null || _p === void 0 ? void 0 : _p.firstname) || "—",
            ownerName: ((_q = owner === null || owner === void 0 ? void 0 : owner.account) === null || _q === void 0 ? void 0 : _q.name) || "—",
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
        if (String(establishment.owner) !== String(requesterOwnerId)) {
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