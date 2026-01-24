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
const Customer_1 = __importDefault(require("../models/Customer"));
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
    var _a;
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
    if (!hasFile) {
        Retour_1.default.warn(isAssociation ? "Legal document is missing" : "KBis is missing");
        return res.status(400).json({
            message: isAssociation
                ? "Document légal association manquant (statuts/récépissé)."
                : "KBis is missing",
        });
    }
    try {
        const owner = yield Owner_1.default.findById(req.body.owner);
        if (!owner) {
            Retour_1.default.warn("Owner not found");
            return res.status(404).json({ message: "Owner not found" });
        }
        if (!owner.isVerified) {
            Retour_1.default.warn("Owner not verified");
            return res.status(400).json({ message: "Owner not verified" });
        }
        const cloudinaryFolder = `${owner.account.firstname}_${owner.account.name}_folder`;
        const uploadResult = yield cloudinary.v2.uploader.upload(fileArr[0].path, {
            folder: cloudinaryFolder,
            public_id: isAssociation ? "AssociationDocument" : "KBis",
            resource_type: "image",
        });
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adressLabel)}`);
        if (!((_a = responseApiGouv.data.features) === null || _a === void 0 ? void 0 : _a.length)) {
            Retour_1.default.warn("Invalid address, no coordinates found.");
            return res
                .status(400)
                .json({ message: "Invalid address, no coordinates found." });
        }
        const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
        const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        if (!isAssociation) {
            const existing = yield Establishment_1.default.findOne({
                "legalInfo.siret": String(siret).trim(),
            });
            if (existing) {
                Retour_1.default.warn("Establishment already exists (SIRET)");
                return res.status(409).json({
                    message: "An establishment with the same SIRET already exists",
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
                Retour_1.default.warn("Establishment already exists (RNA)");
                return res.status(409).json({
                    message: "An association with the same RNA already exists",
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
                KBis: !isAssociation
                    ? {
                        public_id: uploadResult.public_id,
                        secure_url: uploadResult.secure_url,
                    }
                    : undefined,
                rna: isAssociation ? normalizeRna(rna) : undefined,
                legalDocument: isAssociation
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
        Retour_1.default.info("Establishment created successfully");
        return res.status(201).json({
            message: "Establishment created successfully",
            establishment,
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
            .select("name description address location photos openingHours logo events contact acceptedPayments")
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
    updateEstablishment,
    deleteEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFFcEIsc0RBQThCO0FBQzlCLHdEQUEyQztBQUUzQyxrRUFBMEM7QUFFMUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXpDLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBYSxFQUFpQixFQUFFO0lBQ3BELElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUMxQixXQUFXLEVBQUU7U0FDYixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztTQUNuQixPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLE9BQU8sQ0FBQztJQUM3QyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQUUsT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ2xELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDaEUsTUFBTSxFQUNKLFFBQVEsRUFDUixPQUFPLEVBQ1AsUUFBUSxFQUNSLFNBQVMsRUFDVCxPQUFPLEVBQ1AsV0FBVyxFQUNYLE9BQU8sRUFDUCxLQUFLLEVBQ0wsR0FBRyxFQUNILE1BQU0sRUFDTixJQUFJLEVBQ0osR0FBRyxFQUNILGVBQWUsRUFDZixTQUFTLEdBQ1Ys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