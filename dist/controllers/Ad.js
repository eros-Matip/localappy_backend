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
const Ad_1 = require("../models/Ad");
const Retour_1 = __importDefault(require("../library/Retour"));
const cloudinary = require("cloudinary");
const cleanUploadedFiles_1 = require("../utils/cleanUploadedFiles");
const createAd = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, title, description } = req.body;
        const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
        const files = Object.values(filesObject).flat();
        if (!files.length) {
            return res.status(400).json({ message: "Aucune image fournie." });
        }
        const imageUrls = [];
        for (const file of files) {
            const result = yield cloudinary.v2.uploader.upload(file.path, {
                folder: "localappy/ads",
            });
            imageUrls.push(result.secure_url);
        }
        yield (0, cleanUploadedFiles_1.cleanUploadedFiles)(files);
        const newAd = new Ad_1.AdModel({
            type,
            title,
            description,
            image: imageUrls,
        });
        yield newAd.save();
        Retour_1.default.info("Ad created");
        return res.status(201).json(newAd);
    }
    catch (error) {
        console.error("Erreur création annonce :", error);
        return res.status(400).json({ message: "Erreur création annonce", error });
    }
});
const getAds = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ads = yield Ad_1.AdModel.find();
        res.json(ads);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur récupération annonces", error });
    }
});
const getAdById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const ad = yield Ad_1.AdModel.findById(id);
        if (!ad) {
            return res.status(404).json({ message: "Annonce non trouvée" });
        }
        res.json(ad);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur récupération annonce", error });
    }
});
const updateAd = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedAd = yield Ad_1.AdModel.findByIdAndUpdate(id, updateData, {
            new: true,
        });
        if (!updatedAd) {
            return res
                .status(404)
                .json({ message: "Annonce non trouvée pour mise à jour" });
        }
        res.json(updatedAd);
    }
    catch (error) {
        res.status(400).json({ message: "Erreur mise à jour annonce", error });
    }
});
const deleteAd = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedAd = yield Ad_1.AdModel.findByIdAndDelete(id);
        if (!deletedAd) {
            return res
                .status(404)
                .json({ message: "Annonce non trouvée pour suppression" });
        }
        res.json({ message: "Annonce supprimée avec succès" });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur suppression annonce", error });
    }
});
exports.default = { createAd, getAds, getAdById, updateAd, deleteAd };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxQ0FBdUM7QUFDdkMsK0RBQXVDO0FBQ3ZDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxvRUFBaUU7QUFHakUsTUFBTSxRQUFRLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDckQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUM5QyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM1RSxNQUFNLEtBQUssR0FBMEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUV2RSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7UUFFL0IsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUM1RCxNQUFNLEVBQUUsZUFBZTthQUN4QixDQUFDLENBQUM7WUFD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