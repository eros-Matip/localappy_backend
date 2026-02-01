"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const cloudinary = require("cloudinary");
const Customer_1 = __importDefault(require("../models/Customer"));
const Retour_1 = __importDefault(require("../library/Retour"));
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importStar(require("mongoose"));
const Event_1 = __importDefault(require("../models/Event"));
const Theme_1 = __importDefault(require("../models/Theme"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, firstname, address, city, zip, phoneNumber, password, passwordConfirmed, } = req.body;
        if (!email || !name || !firstname) {
            Retour_1.default.error("Some value is missing");
            return res.status(400).json({ message: "Some value is missing" });
        }
        if (!password || password !== passwordConfirmed) {
            Retour_1.default.error("Passwords aren't confirmed");
            return res.status(400).json({ message: "Passwords aren't confirmed" });
        }
        const existingCustomer = yield Customer_1.default.findOne({ email });
        if (existingCustomer) {
            Retour_1.default.error("Customer already exists");
            return res.status(400).json({ message: "Customer already exists" });
        }
        const token = uid2(26);
        const salt = uid2(26);
        const hash = SHA256(password + salt).toString(encBase64);
        let latitude = null;
        let longitude = null;
        if (address && city && zip) {
            try {
                const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address} ${zip} ${city}`);
                if (responseApiGouv.data.features.length > 0) {
                    latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
                    longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
                }
                else {
                    Retour_1.default.error("No coordinates found for the provided address");
                }
            }
            catch (apiError) {
                Retour_1.default.error("Error calling government API for address coordinates");
                return res
                    .status(500)
                    .json({ message: "Error with address API", error: apiError });
            }
        }
        const customer = new Customer_1.default({
            email,
            account: {
                name,
                firstname,
                phoneNumber,
                address,
                zip,
                city,
                location: latitude && longitude ? { lng: longitude, lat: latitude } : undefined,
            },
            premiumStatus: false,
            bills: [],
            eventsAttended: [],
            favorites: [],
            token,
            hash,
            salt,
        });
        yield customer.save();
        return res
            .status(201)
            .json({ message: "Customer created", customer: customer });
    }
    catch (error) {
        Retour_1.default.error("Error caught during customer creation");
        return res.status(500).json({ message: "Error caught", error });
    }
});
const readCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const customerId = req.params.customerId;
    try {
        const customer = yield Customer_1.default.findById(customerId);
        return customer
            ? res.status(200).json({ message: customer })
            : res.status(404).json({ message: "Not found" });
    }
    catch (error) {
        Retour_1.default.error("Error catched");
        return res.status(500).json({ message: "Error catched", error });
    }
});
const readAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;
        const customers = yield Customer_1.default.find().skip(skip).limit(limit);
        const totalCustomers = yield Customer_1.default.countDocuments();
        return res.status(200).json({
            success: true,
            page,
            totalPages: Math.ceil(totalCustomers / limit),
            totalCustomers,
            customers,
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération des clients :", error);
        return res.status(500).json({ message: "Une erreur est survenue.", error });
    }
});
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const customerId = req.params.customerId;
        const customer = yield Customer_1.default.findById(customerId).populate([
            {
                path: "themesFavorites",
                model: "Theme",
            },
            {
                path: "eventsFavorites",
                model: "Event",
            },
        ]);
        if (!customer) {
            Retour_1.default.error("Customer was not found");
            return res.status(404).json({ message: "Customer was not found" });
        }
        const { allInfos, removePicture } = req.body;
        const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
        const allFiles = Object.values(filesObject).flat();
        if (!allInfos && allFiles.length === 0 && removePicture !== "true") {
            Retour_1.default.error("Nothing has changed");
            return res.status(400).json({ message: "Nothing has changed" });
        }
        if (allInfos) {
            customer.set(allInfos);
        }
        if (allFiles.length) {
            for (const file of allFiles) {
                const result = yield cloudinary.v2.uploader.upload(file.path, {
                    folder: `customer_profiles ${customer.account.name}`,
                });
                customer.picture = {
                    public_id: result.public_id,
                    url: result.secure_url,
                };
            }
        }
        if (removePicture === "true") {
            if ((_a = customer.picture) === null || _a === void 0 ? void 0 : _a.public_id) {
                yield cloudinary.v2.uploader.destroy(customer.picture.public_id);
            }
            customer.picture = null;
        }
        if (allInfos === null || allInfos === void 0 ? void 0 : allInfos.language) {
            customer.language = allInfos.language;
        }
        yield customer.save();
        Retour_1.default.log(`customer ${customer.account.firstname} ${customer.account.name} has updated`);
        return res.status(200).json({ message: "Customer updated", customer });
    }
    catch (error) {
        console.error("Error updating customer:", error);
        return res.status(500).json({ message: "Error caught", error });
    }
});
const addingOrRemoveFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { admin, eventsFavoritesArr, themesFavoritesArr, customersFavoritesArr, establishmentFavoritesArr, descriptif, action, } = req.body;
        if (!admin || !admin._id) {
            return res.status(400).json({ message: "Admin ID is required" });
        }
        const customer = yield Customer_1.default.findById(admin._id).populate([
            {
                path: "themesFavorites",
                model: "Theme",
            },
            {
                path: "eventsFavorites",
                model: "Event",
            },
        ]);
        if (!customer) {
            return res.status(404).json({ message: "Customer was not found" });
        }
        if ((!eventsFavoritesArr || eventsFavoritesArr.length === 0) &&
            (!themesFavoritesArr || themesFavoritesArr.length === 0) &&
            (!customersFavoritesArr || customersFavoritesArr.length === 0) &&
            (!establishmentFavoritesArr || establishmentFavoritesArr.length === 0)) {
            if (descriptif) {
                customer.descriptif = descriptif;
            }
            else {
                return res.status(400).json({ message: "No favorites data received" });
            }
        }
        if (!["add", "remove"].includes(action)) {
            return res
                .status(400)
                .json({ message: "Invalid action. Use 'add' or 'remove'." });
        }
        const invalidIds = [];
        const handleFavorites = (arr, customerFavorites, model, type, field) => __awaiter(void 0, void 0, void 0, function* () {
            for (const value of arr) {
                let target;
                if (field) {
                    target = yield model.findOne({ [field]: value });
                }
                else if (mongoose_1.default.isValidObjectId(value)) {
                    target = yield model.findById(value);
                }
                if (target) {
                    const objectId = target._id;
                    if (action === "add") {
                        if (!customerFavorites.some((favId) => favId.equals(objectId))) {
                            customerFavorites.push(objectId);
                        }
                        if (type === "Event") {
                            yield model.findByIdAndUpdate(objectId, {
                                $addToSet: { favorieds: customer._id, date: new Date() },
                            });
                        }
                    }
                    else if (action === "remove") {
                        const index = customerFavorites.findIndex((favId) => favId.equals(objectId));
                        if (index !== -1) {
                            customerFavorites.splice(index, 1);
                        }
                        if (type === "Event") {
                            yield model.findByIdAndUpdate(objectId, {
                                $pull: { favorieds: customer._id },
                            });
                        }
                    }
                }
                else {
                    invalidIds.push({ type, id: value });
                }
            }
        });
        if (eventsFavoritesArr) {
            yield handleFavorites(eventsFavoritesArr, Object(customer).eventsFavorites, Event_1.default, "Event");
        }
        if (themesFavoritesArr) {
            yield handleFavorites(themesFavoritesArr, Object(customer).themesFavorites, Theme_1.default, "Theme", "theme");
        }
        if (customersFavoritesArr) {
            yield handleFavorites(customersFavoritesArr, Object(customer).customersFavorites, Customer_1.default, "Customer");
        }
        if (establishmentFavoritesArr) {
            yield handleFavorites(establishmentFavoritesArr, Object(customer).establishmentFavorites, Establishment_1.default, "Establishment");
        }
        if (invalidIds.length > 0) {
            return res.status(400).json({
                message: "Some IDs do not correspond to valid entries",
                invalidIds,
            });
        }
        yield customer.save();
        return res.status(200).json({ message: "Favorites updated", customer });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error occurred while updating favorites", error });
    }
});
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uniqObjectIds = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
        const id = typeof v === "string"
            ? new mongoose_1.Types.ObjectId(v)
            : new mongoose_1.Types.ObjectId(v);
        const key = id.toString();
        if (!seen.has(key)) {
            seen.add(key);
            out.push(id);
        }
    }
    return out;
};
const inviteStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { establishmentId } = req.params;
        const { firstname, name, email, role, owner } = req.body;
        if (!mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "Invalid establishmentId" });
        }
        const adminId = typeof owner === "string" ? owner : owner === null || owner === void 0 ? void 0 : owner._id;
        if (!adminId || !mongoose_1.default.isValidObjectId(adminId)) {
            return res.status(400).json({ message: "Admin ID is required" });
        }
        if (!(firstname === null || firstname === void 0 ? void 0 : firstname.trim()) || !(name === null || name === void 0 ? void 0 : name.trim()) || !(email === null || email === void 0 ? void 0 : email.trim())) {
            return res.status(400).json({
                message: "firstname, name and email are required",
            });
        }
        const establishmentFinded = yield Establishment_1.default.findById(establishmentId);
        if (!establishmentFinded) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const emailLower = String(email).trim().toLowerCase();
        const firstnameRx = new RegExp(`^${escapeRegex(firstname.trim())}$`, "i");
        const nameRx = new RegExp(`^${escapeRegex(name.trim())}$`, "i");
        const customer = yield Customer_1.default.findOne({
            email: emailLower,
            "account.firstname": firstnameRx,
            "account.name": nameRx,
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        const askingArr = Array.isArray(customer.establishmentStaffAsking)
            ? customer.establishmentStaffAsking
            : [];
        const alreadyPending = askingArr.some((inv) => {
            var _a;
            const sameEst = ((_a = inv === null || inv === void 0 ? void 0 : inv.establishment) === null || _a === void 0 ? void 0 : _a.toString()) === establishmentId;
            const notAnswered = typeof (inv === null || inv === void 0 ? void 0 : inv.response) !== "boolean";
            return sameEst && notAnswered;
        });
        if (alreadyPending) {
            return res.status(409).json({ message: "Invitation already pending" });
        }
        customer.establishmentStaffAsking = askingArr;
        customer.establishmentStaffAsking.push({
            date: new Date(),
            establishment: new mongoose_1.Types.ObjectId(establishmentId),
            establishmentName: establishmentFinded.name,
            role: role || "Staff",
            askedBy: new mongoose_1.Types.ObjectId(adminId),
            response: undefined,
        });
        yield customer.save();
        return res.status(200).json({ message: "invitation sent" });
    }
    catch (err) {
        console.error("[inviteStaff] error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
const respondToStaffInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { invitationId } = req.params;
        const { response } = req.body;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || req.body.customerId;
        if (!userId || !mongoose_1.default.isValidObjectId(String(userId))) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!mongoose_1.default.isValidObjectId(invitationId)) {
            return res.status(400).json({ message: "Invalid invitationId" });
        }
        if (!["accept", "reject"].includes(response)) {
            return res.status(400).json({ message: "Invalid response" });
        }
        const customer = yield Customer_1.default.findById(userId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        const askingArr = Array.isArray(customer.establishmentStaffAsking)
            ? customer.establishmentStaffAsking
            : [];
        const idx = askingArr.findIndex((a) => { var _a; return ((_a = a === null || a === void 0 ? void 0 : a._id) === null || _a === void 0 ? void 0 : _a.toString()) === invitationId; });
        if (idx === -1) {
            return res
                .status(404)
                .json({ message: "Invitation not found on customer" });
        }
        const invitation = askingArr[idx];
        if (typeof invitation.response === "boolean") {
            return res.status(409).json({
                message: "This invitation has already been answered",
            });
        }
        invitation.response = response === "accept";
        if (response === "reject") {
            customer.establishmentStaffAsking = askingArr;
            yield customer.save();
            return res.status(200).json({
                message: "Invitation rejected",
                customer,
            });
        }
        const estId = invitation.establishment;
        if (!estId || !mongoose_1.default.isValidObjectId(String(estId))) {
            return res
                .status(400)
                .json({ message: "Invalid establishment on invite" });
        }
        const staffOf = Array.isArray(customer.establishmentStaffOf)
            ? customer.establishmentStaffOf
            : [];
        const alreadyStaffOf = staffOf.some((id) => (id === null || id === void 0 ? void 0 : id.toString()) === String(estId));
        if (!alreadyStaffOf) {
            staffOf.push(new mongoose_1.Types.ObjectId(estId));
        }
        customer.establishmentStaffAsking = askingArr;
        customer.establishmentStaffOf = uniqObjectIds(staffOf);
        const savedCustomer = yield customer.save();
        const establishment = yield Establishment_1.default.findById(estId);
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const estStaff = Array.isArray(establishment.staff)
            ? establishment.staff
            : [];
        const alreadyIn = estStaff.some((id) => (id === null || id === void 0 ? void 0 : id.toString()) === String(savedCustomer._id));
        if (!alreadyIn) {
            establishment.staff = uniqObjectIds([
                ...estStaff.map((x) => String(x)),
                String(savedCustomer._id),
            ]);
            yield establishment.save();
        }
        return res.status(200).json({
            message: "Invitation accepted",
            customer: savedCustomer,
            establishment,
        });
    }
    catch (err) {
        console.error("[respondToStaffInvitation] error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return Customer_1.default.findByIdAndDelete(req.body.admin)
        .then((customer) => customer
        ? res.status(200).json({ message: "Customer is deleted" })
        : res.status(404).json({ message: "Customer not found" }))
        .catch((error) => {
        Retour_1.default.error("Error catched");
        return res.status(500).json({ message: "Error catched", error });
    });
});
exports.default = {
    createCustomer,
    readCustomer,
    readAll,
    updateCustomer,
    addingOrRemoveFavorites,
    inviteStaff,
    respondToStaffInvitation,
    deleteCustomer,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQ3VzdG9tZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBR3pDLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsa0RBQTBCO0FBQzFCLHFEQUEyQztBQUMzQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLDRFQUFvRDtBQUVwRCxNQUFNLGNBQWMsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUMzRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQ0osS0FBSyxFQUNMLElBQUksRUFDSixTQUFTLEVBQ1QsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsV0FBVyxFQUNYLFFBQVEsRUFDUixpQkFBaUIsR0FDbEIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBR2IsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLGdCQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUdELElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxLQUFLLGlCQUFpQixFQUFF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