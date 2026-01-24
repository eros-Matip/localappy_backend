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