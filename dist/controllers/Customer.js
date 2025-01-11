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
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const cloudinary = require("cloudinary");
const Customer_1 = __importDefault(require("../models/Customer"));
const Retour_1 = __importDefault(require("../library/Retour"));
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
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
        const customers = yield Customer_1.default.find();
        return res.status(200).json({ message: customers });
    }
    catch (error) {
        Retour_1.default.error("Error catched");
        return res.status(500).json({ message: "Error catched", error });
    }
});
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customerId = req.params.customerId;
        const customer = yield Customer_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer was not found" });
        }
        const { allInfos } = req.body;
        const fileKeys = req.files ? Object(req.files) : [];
        console.log("fileKeys", fileKeys);
        if (!allInfos && !fileKeys.length) {
            console.error("Nothing has changed");
            return res.status(400).json({ message: "Nothing has changed" });
        }
        if (allInfos) {
            customer.set(allInfos);
        }
        if (fileKeys.length) {
            for (const file of fileKeys) {
                const result = yield cloudinary.v2.uploader.upload(file.path, {
                    folder: "customer_profiles",
                });
                customer.picture = {
                    public_id: result.public_id,
                    url: result.secure_url,
                };
            }
        }
        yield customer.save();
        return res
            .status(200)
            .json({ message: "Customer picture's updated", customer });
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
                                $addToSet: { favorieds: customer._id },
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
    deleteCustomer,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQ3VzdG9tZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBR3pDLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsa0RBQTBCO0FBQzFCLHdEQUFnQztBQUNoQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLDRFQUFvRDtBQUVwRCxNQUFNLGNBQWMsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUMzRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQ0osS0FBSyxFQUNMLElBQUksRUFDSixTQUFTLEVBQ1QsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsV0FBVyxFQUNYLFFBQVEsRUFDUixpQkFBaUIsR0FDbEIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBR2IsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLGdCQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUdELElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDaEQsZ0JBQU0sQ0FBQyxLQUFLLENBQUMs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