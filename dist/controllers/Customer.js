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
        if (!email ||
            !name ||
            !firstname ||
            !phoneNumber ||
            !address ||
            !city ||
            !zip) {
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
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address} ${zip} ${city}`);
        const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
        const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        const customer = new Customer_1.default({
            email,
            account: {
                name,
                firstname,
                phoneNumber,
                address,
                zip,
                city,
                location: {
                    lng: longitude,
                    lat: latitude,
                },
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
        return res.status(201).json({ message: "Customer created", customer });
    }
    catch (error) {
        Retour_1.default.error("Error catched");
        return res.status(500).json({ message: "Error catched", error });
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
        const fileKeys = req.files ? Object(req.files).file : [];
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
        const { admin, eventsFavoritesArr, themesFavoritesArr, customersFavoritesArr, establishmentFavoritesArr, action, } = req.body;
        if (!admin || !admin._id) {
            return res.status(400).json({ message: "Admin ID is required" });
        }
        if ((!eventsFavoritesArr || eventsFavoritesArr.length === 0) &&
            (!themesFavoritesArr || themesFavoritesArr.length === 0) &&
            (!customersFavoritesArr || customersFavoritesArr.length === 0) &&
            (!establishmentFavoritesArr || establishmentFavoritesArr.length === 0)) {
            return res.status(400).json({ message: "No favorites data received" });
        }
        if (!["add", "remove"].includes(action)) {
            return res
                .status(400)
                .json({ message: "Invalid action. Use 'add' or 'remove'." });
        }
        const customer = yield Customer_1.default.findById(admin._id);
        if (!customer) {
            Retour_1.default.error("Customer was not found");
            return res.status(404).json({ message: "Customer was not found" });
        }
        const invalidIds = [];
        const handleFavorites = (arr, customerFavorites, model, type) => __awaiter(void 0, void 0, void 0, function* () {
            for (const id of arr) {
                if (mongoose_1.default.isValidObjectId(id)) {
                    const exists = yield model.exists({ _id: id });
                    if (exists) {
                        const objectId = new mongoose_1.default.Types.ObjectId(id);
                        if (action === "add") {
                            if (!customerFavorites.includes(objectId)) {
                                customerFavorites.push(objectId);
                            }
                        }
                        else if (action === "remove") {
                            const index = customerFavorites.findIndex((favId) => favId.equals(objectId));
                            if (index !== -1) {
                                customerFavorites.splice(index, 1);
                            }
                        }
                    }
                    else {
                        invalidIds.push({ type, id });
                    }
                }
                else {
                    invalidIds.push({ type, id });
                }
            }
        });
        if (eventsFavoritesArr) {
            yield handleFavorites(eventsFavoritesArr, Object(customer).eventsFavorites, Event_1.default, "Event");
        }
        if (themesFavoritesArr) {
            yield handleFavorites(themesFavoritesArr, Object(customer).themesFavorites, Theme_1.default, "Theme");
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
        return res.status(200).json("Favorites updated");
    }
    catch (error) {
        Retour_1.default.error("Error occurred while updating favorites");
        return res
            .status(500)
            .json({ message: "Error occurred while updating favorites", error });
    }
});
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const customerId = req.params.customerId;
    return Customer_1.default.findByIdAndDelete(customerId)
        .then((customer) => customer
        ? res.status(200).json({ message: "CRE is deleted" })
        : res.status(404).json({ message: "Not found" }))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQ3VzdG9tZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBR3pDLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsa0RBQTBCO0FBQzFCLHdEQUFnQztBQUNoQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLDRFQUFvRDtBQUVwRCxNQUFNLGNBQWMsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUMzRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQ0osS0FBSyxFQUNMLElBQUksRUFDSixTQUFTLEVBQ1QsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsV0FBVyxFQUNYLFFBQVEsRUFDUixpQkFBaUIsR0FDbEIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBR2IsSUFDRSxDQUFDLEtBQUs7WUFDTixDQUFDLElBQUk7WUFDTCxDQUFDLFNBQVM7WUFDVixDQUFDLFdBQVc7WUFDWixDQUFDLE9BQU87WUFDUixDQUFDLElBQUk7WUFDTCxDQUFDLEdBQUcsRUFDSixDQUFDO1lBQ0QsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUN0QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBR0QsSUFBSSxDQUFDLFFBQVEs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