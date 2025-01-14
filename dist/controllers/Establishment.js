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
const cloudinary = require("cloudinary");
const createEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { activity, website, facebook, instagram, twitter, adressLabel, society, siret, adress, city, zip, activityCodeNAF, } = req.body;
    if (!activity ||
        !adressLabel ||
        !society ||
        !siret ||
        !adress ||
        !city ||
        !zip) {
        Retour_1.default.warn("Some value is missing");
        return res.status(404).json({ message: "Some value is missing" });
    }
    console.log(Object(req.files).file);
    if (!Object(req.files).file) {
        Retour_1.default.warn("KBis is missing");
        return res.status(400).json({ message: "KBis is missing" });
    }
    const fileKeys = req.files ? Object(req.files).file : [];
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
        let kbisUploadResult = null;
        if (fileKeys.length > 0) {
            kbisUploadResult = yield cloudinary.v2.uploader.upload(fileKeys[0].path, {
                folder: cloudinaryFolder,
                public_id: "KBis",
                resource_type: "image",
            });
        }
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adressLabel)}`);
        if (!responseApiGouv.data.features.length) {
            Retour_1.default.warn("Invalid address, no coordinates found.");
            return res
                .status(400)
                .json({ message: "Invalid address, no coordinates found." });
        }
        const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
        const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        const existingEstablishment = yield Establishment_1.default.findOne({
            name: society,
            siret: siret,
        });
        if (existingEstablishment) {
            Retour_1.default.warn("An establishment with the same name already exists");
            return res.status(409).json({
                message: "An establishment with the same name already exists",
            });
        }
        const establishment = new Establishment_1.default({
            name: society,
            type: activity,
            siret: siret,
            picture: {
                public_id: "",
                secure_url: "",
            },
            address: {
                street: adress,
                city: city,
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
                registrationNumber: siret,
                KBis: kbisUploadResult
                    ? {
                        public_id: kbisUploadResult.public_id,
                        secure_url: kbisUploadResult.secure_url,
                    }
                    : null,
                activityCodeNAF: activityCodeNAF,
            },
            owner: owner._id,
            events: [],
        });
        yield establishment.save();
        owner.establishments.push(Object(establishment)._id);
        yield owner.save();
        Retour_1.default.info("Establishment created successfully");
        return res.status(201).json({
            message: "Establishment created successfully",
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`Error creating establishment: ${error}`);
        return res.status(500).json({
            error: "Failed to create establishment",
            details: error,
        });
    }
});
const getEstablishmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const establishment = yield Establishment_1.default.findById(id).populate("owner");
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        return res.status(200).json(establishment);
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to retrieve establishment" });
    }
});
const updateEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const updatedEstablishment = yield Establishment_1.default.findByIdAndUpdate(id, updatedData, { new: true });
        if (!updatedEstablishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        return res.status(200).json(updatedEstablishment);
    }
    catch (error) {
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
    getEstablishmentById,
    updateEstablishment,
    deleteEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBRXZDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUd6QyxNQUFNLG1CQUFtQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ2hFLE1BQU0sRUFDSixRQUFRLEVBQ1IsT0FBTyxFQUNQLFFBQVEsRUFDUixTQUFTLEVBQ1QsT0FBTyxFQUNQLFdBQVcsRUFDWCxPQUFPLEVBQ1AsS0FBSyxFQUNMLE1BQU0sRUFDTixJQUFJLEVBQ0osR0FBRyxFQUNILGVBQWUsR0FDaEIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO0lBRWIsSUFDRSxDQUFDLFFBQVE7UUFDVCxDQUFDLFdBQVc7UUFDWixDQUFDLE9BQU87UUFDUixDQUFDLEtBQUs7UUFDTixDQUFDLE1BQU07UUFDUCxDQUFDLElBQUk7UUFDTCxDQUFDLEdBQUcsRUFDSixDQUFDO1FBQ0QsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNyQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXBDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzVCLGdCQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixD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