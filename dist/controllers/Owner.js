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
const Owner_1 = __importDefault(require("../models/Owner"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Retour_1 = __importDefault(require("../library/Retour"));
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const twilio_1 = __importDefault(require("twilio"));
const agenda_1 = require("agenda");
const config_1 = __importDefault(require("../config/config"));
const notifyAdmins_1 = require("../services/notifyAdmins");
const cloudinary = require("cloudinary");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
const agenda = new agenda_1.Agenda({ db: { address: `${config_1.default.mongooseUrl}` } });
agenda.define("delete unverified owner", (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { ownerId } = job.attrs.data;
        const owner = yield Owner_1.default.findById(ownerId);
        if (!owner) {
            Retour_1.default.log(`Owner with ID ${ownerId} not found. No action taken.`);
            return;
        }
        if (owner.isVerified) {
            Retour_1.default.log(`Owner with ID ${ownerId} is verified. No action taken.`);
            return;
        }
        Retour_1.default.log(`Unverified owner ${owner.email} deleted after 1 hour.`);
        if ((_a = owner.cni) === null || _a === void 0 ? void 0 : _a.public_id) {
            yield cloudinary.uploader.destroy(owner.cni.public_id);
            Retour_1.default.log(`Deleted CNI file: ${owner.cni.public_id}`);
        }
        const folderName = `${owner.account.firstname}_${owner.account.name}_folder`;
        try {
            const { resources } = yield cloudinary.api.resources({
                type: "upload",
                prefix: folderName,
                max_results: 500,
            });
            for (const file of resources) {
                yield cloudinary.uploader.destroy(file.public_id);
            }
            yield cloudinary.api.delete_folder(folderName);
            Retour_1.default.log(`Deleted Cloudinary folder: ${folderName}`);
        }
        catch (e) {
            console.warn(`Cloudinary cleanup warning for folder ${folderName}:`, e);
        }
        const customerFinded = yield Customer_1.default.findOne({ ownerAccount: owner._id });
        if (customerFinded) {
            customerFinded.ownerAccount = null;
            yield customerFinded.save();
        }
        yield owner.deleteOne();
    }
    catch (error) {
        const ownerId = (_b = job.attrs.data) === null || _b === void 0 ? void 0 : _b.ownerId;
        Retour_1.default.error(`Failed to delete unverified owner with ID ${ownerId}`);
        console.error(`Failed to delete unverified owner with ID ${ownerId}:`, error);
    }
}));
const createOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, firstname, customerId, phoneNumber, password, passwordConfirmed, } = req.body;
        if (!email ||
            !name ||
            !firstname ||
            !phoneNumber ||
            !password ||
            !passwordConfirmed) {
            Retour_1.default.error("All fields are required");
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password !== passwordConfirmed) {
            Retour_1.default.error("Passwords do not match");
            return res.status(400).json({ error: "Passwords do not match" });
        }
        const ownerFinded = yield Owner_1.default.findOne({ email });
        if (ownerFinded) {
            Retour_1.default.error("Account already exists");
            return res.status(400).json({ error: "Account already exists" });
        }
        const customerFinded = yield Customer_1.default.findById(customerId);
        if (!customerFinded) {
            Retour_1.default.error("Customer not found");
            return res.status(404).json({ error: "Customer not found" });
        }
        const fileKeys = req.files ? Object(req.files).file : [];
        const hasIdentityDoc = Array.isArray(fileKeys) && fileKeys.length > 0;
        const token = uid2(26);
        const salt = uid2(26);
        const hash = SHA256(password + salt).toString(encBase64);
        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        const formattedPhoneNumber = phoneNumber
            .replace(/\D/g, "")
            .replace(/^0/, "33");
        if (!/^(33)[6-7]\d{8}$/.test(formattedPhoneNumber)) {
            Retour_1.default.error("Invalid phone number format");
            return res.status(400).json({ error: "Invalid phone number format" });
        }
        try {
            yield client.messages.create({
                body: `Votre code d'activation est: ${verificationCode}`,
                from: "Localappy",
                to: `+${formattedPhoneNumber}`,
            });
        }
        catch (smsError) {
            console.error("Twilio error:", smsError);
            Retour_1.default.error("Twilio error");
            return res.status(500).json({
                error: "Failed to send SMS verification code",
                details: smsError,
            });
        }
        const owner = new Owner_1.default({
            email,
            account: {
                name,
                firstname,
                phoneNumber,
            },
            token,
            hash,
            salt,
            establishments: [],
            isVerified: false,
            verificationCode,
            customerAccount: customerFinded,
        });
        if (hasIdentityDoc) {
            const result = yield cloudinary.v2.uploader.upload(fileKeys[0].path, {
                folder: `${owner.account.firstname}_${owner.account.name}_folder`,
            });
            owner.cni = {
                public_id: result.public_id,
                url: result.secure_url,
            };
        }
        yield owner.save();
        Object(customerFinded).ownerAccount = owner;
        yield Object(customerFinded).save();
        yield agenda.start();
        yield agenda.schedule("in 1 hour", "delete unverified owner", {
            ownerId: owner._id,
        });
        yield (0, notifyAdmins_1.notifyAdminsNewOwner)({
            ownerId: String(owner._id),
            ownerFirstname: owner.account.firstname,
            ownerName: owner.account.name,
            customerId: String(customerFinded._id),
        });
        Retour_1.default.info("Owner created. Verification code sent via SMS.");
        return res.status(201).json({
            message: "Owner created. Verification code sent via SMS.",
            ownerId: owner._id,
            token: owner.token,
            identityProvided: hasIdentityDoc,
        });
    }
    catch (error) {
        console.error("Error creating owner:", error);
        Retour_1.default.error("Failed to create owner");
        return res
            .status(500)
            .json({ error: "Failed to create owner", details: error });
    }
});
const OWNER_SAFE_PROJECTION = {
    hash: 0,
    salt: 0,
    token: 0,
    verificationCode: 0,
    expoPushToken: 0,
    "passwordLosted.code": 0,
};
function toBool(v) {
    if (v === undefined)
        return undefined;
    if (v === true || v === "true" || v === 1 || v === "1")
        return true;
    if (v === false || v === "false" || v === 0 || v === "0")
        return false;
    return undefined;
}
function toInt(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function resolveOwnerIdsFromEstablishmentFilters(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { activationStatus, hasBannedEstablishment, hasDisabledEstablishment } = params;
        const estQuery = {};
        if (activationStatus &&
            ["pending", "approved", "rejected"].includes(activationStatus)) {
            estQuery.activationStatus = activationStatus;
        }
        if (hasBannedEstablishment === true)
            estQuery.banned = true;
        if (hasDisabledEstablishment === true)
            estQuery.activated = false;
        const hasAny = Object.keys(estQuery).length > 0;
        if (!hasAny)
            return null;
        const ownerIds = yield Establishment_1.default.distinct("owner", estQuery);
        return (ownerIds || []).filter(Boolean);
    });
}
const getOwnersForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const q = String(req.query.q || "").trim();
        const verified = toBool(req.query.verified);
        const validated = toBool(req.query.validated);
        const missingCni = toBool(req.query.missingCni);
        const missingPicture = toBool(req.query.missingPicture);
        const multi = toBool(req.query.multi);
        const activationStatus = String(req.query.activationStatus || "").trim();
        const hasBannedEstablishment = toBool(req.query.hasBannedEstablishment);
        const hasDisabledEstablishment = toBool(req.query.hasDisabledEstablishment);
        const page = Math.max(1, toInt(req.query.page, 1));
        const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 30)));
        const skip = (page - 1) * limit;
        const sortRaw = String(req.query.sort || "createdAt_desc");
        const sort = sortRaw === "createdAt_asc"
            ? { createdAt: 1 }
            : sortRaw === "updatedAt_desc"
                ? { updatedAt: -1 }
                : sortRaw === "updatedAt_asc"
                    ? { updatedAt: 1 }
                    : { createdAt: -1 };
        const match = {};
        if (q) {
            const rq = new RegExp(escapeRegex(q), "i");
            const or = [
                { email: rq },
                { "account.name": rq },
                { "account.firstname": rq },
            ];
            if (/^[0-9a-fA-F]{24}$/.test(q))
                or.push({ _id: q });
            const digits = q.replace(/\D/g, "");
            if (digits.length >= 6 && Number.isFinite(Number(digits))) {
                or.push({ "account.phoneNumber": Number(digits) });
            }
            match.$or = or;
        }
        if (verified !== undefined)
            match.isVerified = verified;
        if (validated !== undefined)
            match.isValidated = validated;
        if (missingCni === true) {
            match.$or = [
                ...(match.$or || []),
                { "cni.url": { $exists: false } },
                { "cni.url": null },
                { "cni.url": "" },
            ];
        }
        if (missingPicture === true) {
            match.$or = [
                ...(match.$or || []),
                { "picture.url": { $exists: false } },
                { "picture.url": null },
                { "picture.url": "" },
            ];
        }
        if (multi === true) {
            match.$expr = { $gte: [{ $size: "$establishments" }, 2] };
        }
        else if (multi === false) {
            match.$expr = { $lte: [{ $size: "$establishments" }, 1] };
        }
        const filteredOwnerIds = yield resolveOwnerIdsFromEstablishmentFilters({
            activationStatus,
            hasBannedEstablishment,
            hasDisabledEstablishment,
        });
        if (filteredOwnerIds && filteredOwnerIds.length === 0) {
            return res.status(200).json({
                owners: [],
                stats: {
                    total: 0,
                    verified: 0,
                    validated: 0,
                    missingCni: 0,
                    missingPicture: 0,
                    multi: 0,
                },
                page,
                limit,
            });
        }
        if (filteredOwnerIds && filteredOwnerIds.length > 0) {
            match._id = { $in: filteredOwnerIds };
        }
        const [owners, total] = yield Promise.all([
            Owner_1.default.find(match)
                .select(OWNER_SAFE_PROJECTION)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate({
                path: "establishments",
                select: "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
            })
                .lean(),
            Owner_1.default.countDocuments(match),
        ]);
        const statsAgg = yield Owner_1.default.aggregate([
            { $match: match },
            {
                $project: {
                    isVerified: 1,
                    isValidated: 1,
                    hasCni: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ["$cni", null] },
                                    { $ne: ["$cni.url", null] },
                                    { $ne: ["$cni.url", ""] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                    hasPicture: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ["$picture", null] },
                                    { $ne: ["$picture.url", null] },
                                    { $ne: ["$picture.url", ""] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                    estCount: { $size: "$establishments" },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    verified: { $sum: { $cond: ["$isVerified", 1, 0] } },
                    validated: { $sum: { $cond: ["$isValidated", 1, 0] } },
                    missingCni: { $sum: { $cond: [{ $eq: ["$hasCni", 0] }, 1, 0] } },
                    missingPicture: {
                        $sum: { $cond: [{ $eq: ["$hasPicture", 0] }, 1, 0] },
                    },
                    multi: { $sum: { $cond: [{ $gte: ["$estCount", 2] }, 1, 0] } },
                },
            },
        ]);
        const stats = (statsAgg === null || statsAgg === void 0 ? void 0 : statsAgg[0]) || {
            total: 0,
            verified: 0,
            validated: 0,
            missingCni: 0,
            missingPicture: 0,
            multi: 0,
        };
        return res.status(200).json({
            owners,
            stats: {
                total: stats.total || 0,
                verified: stats.verified || 0,
                validated: stats.validated || 0,
                missingCni: stats.missingCni || 0,
                missingPicture: stats.missingPicture || 0,
                multi: stats.multi || 0,
            },
            page,
            limit,
            total,
        });
    }
    catch (error) {
        console.error("Failed to list owners (admin):", error);
        return res.status(500).json({
            error: "Failed to list owners",
            details: error,
        });
    }
});
const getOwnerDetailsForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const owner = yield Owner_1.default.findById(ownerId)
            .select(OWNER_SAFE_PROJECTION)
            .populate({
            path: "establishments",
            select: "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
        })
            .lean();
        if (!owner)
            return res.status(404).json({ message: "Owner not found" });
        return res.status(200).json({ owner });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to retrieve owner",
            details: error,
        });
    }
});
const setOwnerValidatedForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { ownerId } = req.params;
        const value = toBool((_a = req.body) === null || _a === void 0 ? void 0 : _a.value);
        if (value === undefined) {
            return res.status(400).json({ error: "value (boolean) is required" });
        }
        const owner = yield Owner_1.default.findByIdAndUpdate(ownerId, { isValidated: value }, { new: true })
            .select(OWNER_SAFE_PROJECTION)
            .lean();
        if (!owner)
            return res.status(404).json({ message: "Owner not found" });
        return res.status(200).json({ message: "Owner updated", owner });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to update owner",
            details: error,
        });
    }
});
const setOwnerVerifiedForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { ownerId } = req.params;
        const value = toBool((_a = req.body) === null || _a === void 0 ? void 0 : _a.value);
        if (value === undefined) {
            return res.status(400).json({ error: "value (boolean) is required" });
        }
        const owner = yield Owner_1.default.findByIdAndUpdate(ownerId, { isVerified: value }, { new: true })
            .select(OWNER_SAFE_PROJECTION)
            .lean();
        if (!owner)
            return res.status(404).json({ message: "Owner not found" });
        return res.status(200).json({ message: "Owner updated", owner });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to update owner",
            details: error,
        });
    }
});
const resetOwnerAttemptsForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const owner = yield Owner_1.default.findByIdAndUpdate(ownerId, { attempts: 0 }, { new: true })
            .select(OWNER_SAFE_PROJECTION)
            .lean();
        if (!owner)
            return res.status(404).json({ message: "Owner not found" });
        return res.status(200).json({ message: "Attempts reset", owner });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to reset attempts",
            details: error,
        });
    }
});
const resetOwnerPasswordLostedForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const owner = yield Owner_1.default.findByIdAndUpdate(ownerId, { "passwordLosted.status": false, "passwordLosted.code": undefined }, { new: true })
            .select(OWNER_SAFE_PROJECTION)
            .lean();
        if (!owner)
            return res.status(404).json({ message: "Owner not found" });
        return res.status(200).json({ message: "Password lost reset", owner });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to reset password losted",
            details: error,
        });
    }
});
const linkOwnerToEstablishmentForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const { establishmentId } = req.body || {};
        if (!establishmentId) {
            return res.status(400).json({ error: "establishmentId is required" });
        }
        const [owner, est] = yield Promise.all([
            Owner_1.default.findById(ownerId),
            Establishment_1.default.findById(establishmentId),
        ]);
        if (!owner)
            return res.status(404).json({ error: "Owner not found" });
        if (!est)
            return res.status(404).json({ error: "Establishment not found" });
        yield Promise.all([
            Owner_1.default.updateOne({ _id: owner._id }, { $addToSet: { establishments: est._id } }),
            Establishment_1.default.updateOne({ _id: est._id }, { $addToSet: { owner: owner._id } }),
        ]);
        const refreshed = yield Owner_1.default.findById(ownerId)
            .select(OWNER_SAFE_PROJECTION)
            .populate({
            path: "establishments",
            select: "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
        })
            .lean();
        return res.status(200).json({
            message: "Owner linked to establishment",
            owner: refreshed,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to link owner to establishment",
            details: error,
        });
    }
});
const unlinkOwnerFromEstablishmentForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const { establishmentId } = req.body || {};
        if (!establishmentId) {
            return res.status(400).json({ error: "establishmentId is required" });
        }
        yield Promise.all([
            Owner_1.default.updateOne({ _id: ownerId }, { $pull: { establishments: establishmentId } }),
            Establishment_1.default.updateOne({ _id: establishmentId }, { $pull: { owner: ownerId } }),
        ]);
        const refreshed = yield Owner_1.default.findById(ownerId)
            .select(OWNER_SAFE_PROJECTION)
            .populate({
            path: "establishments",
            select: "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
        })
            .lean();
        if (!refreshed)
            return res.status(404).json({ error: "Owner not found" });
        return res.status(200).json({
            message: "Owner unlinked from establishment",
            owner: refreshed,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to unlink owner from establishment",
            details: error,
        });
    }
});
const deleteOwnerForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { ownerId } = req.params;
        const owner = yield Owner_1.default.findById(ownerId);
        if (!owner)
            return res.status(404).json({ message: "Owner not found" });
        yield Promise.all([
            Establishment_1.default.updateMany({ owner: owner._id }, { $pull: { owner: owner._id } }),
            Owner_1.default.updateOne({ _id: owner._id }, { $set: { establishments: [] } }),
        ]);
        yield Customer_1.default.updateMany({ ownerAccount: owner._id }, { $set: { ownerAccount: null } });
        if ((_a = owner.cni) === null || _a === void 0 ? void 0 : _a.public_id) {
            try {
                yield cloudinary.uploader.destroy(owner.cni.public_id);
            }
            catch (e) {
                console.warn("Cloudinary destroy CNI warning:", e);
            }
        }
        if ((_b = owner.picture) === null || _b === void 0 ? void 0 : _b.public_id) {
            try {
                yield cloudinary.uploader.destroy(owner.picture.public_id);
            }
            catch (e) {
                console.warn("Cloudinary destroy picture warning:", e);
            }
        }
        const folderName = `${owner.account.firstname}_${owner.account.name}_folder`;
        try {
            const { resources } = yield cloudinary.api.resources({
                type: "upload",
                prefix: folderName,
                max_results: 500,
            });
            for (const file of resources) {
                yield cloudinary.uploader.destroy(file.public_id);
            }
            yield cloudinary.api.delete_folder(folderName);
        }
        catch (e) {
            console.warn(`Cloudinary cleanup warning for folder ${folderName}:`, e);
        }
        yield owner.deleteOne();
        return res.status(200).json({ message: "Owner deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to delete owner",
            details: error,
        });
    }
});
const getOwnerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const owner = yield Owner_1.default.findById(ownerId)
            .select(OWNER_SAFE_PROJECTION)
            .populate({
            path: "establishments",
            select: "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
        });
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(owner);
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to retrieve owner", details: error });
    }
});
const updateOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const updatedData = req.body;
        const updatedOwner = yield Owner_1.default.findByIdAndUpdate(ownerId, updatedData, {
            new: true,
        }).select(OWNER_SAFE_PROJECTION);
        if (!updatedOwner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(updatedOwner);
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to update owner", details: error });
    }
});
const deleteOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const deletedOwner = yield Owner_1.default.findByIdAndDelete(ownerId);
        if (!deletedOwner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json({ message: "Owner deleted successfully" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to delete owner", details: error });
    }
});
exports.default = {
    createOwner,
    getOwnerById,
    updateOwner,
    deleteOwner,
    getOwnersForAdmin,
    getOwnerDetailsForAdmin,
    setOwnerValidatedForAdmin,
    setOwnerVerifiedForAdmin,
    resetOwnerAttemptsForAdmin,
    resetOwnerPasswordLostedForAdmin,
    linkOwnerToEstablishmentForAdmin,
    unlinkOwnerFromEstablishmentForAdmin,
    deleteOwnerForAdmin,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvT3duZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0REFBb0M7QUFDcEMsNEVBQW9EO0FBQ3BELGtFQUEwQztBQUMxQywrREFBdUM7QUFFdkMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDM0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLG9EQUE0QjtBQUM1QixtQ0FBcUM7QUFDckMsOERBQXNDO0FBQ3RDLDJEQUFnRTtBQUVoRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFHekMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztBQUNsRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ2hELE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sRUFBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFHN0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxnQkFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBT3hFLE1BQU0sQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUUsQ0FBTyxHQUFRLEVBQUUsRUFBRTs7SUFDMUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBMkIsQ0FBQztRQUUxRCxNQUFNLEtBQUssR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFD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