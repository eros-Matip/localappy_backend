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
const Ads_1 = require("../models/Ads");
const Retour_1 = __importDefault(require("../library/Retour"));
const cloudinary = require("cloudinary");
const cleanUploadedFiles_1 = require("../utils/cleanUploadedFiles");
const mongoose_1 = __importDefault(require("mongoose"));
const Event_1 = __importDefault(require("../models/Event"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const createAd = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { type, title, description, event } = req.body;
        const files = ((_a = req.files) === null || _a === void 0 ? void 0 : _a.file) || [];
        let finalTitle = title;
        let finalDescription = description;
        let imageUrls = [];
        const establishmentFinded = yield Establishment_1.default.findById(req.params.establishmentId);
        if (!establishmentFinded) {
            Retour_1.default.error("Establishment was not found");
            return res.status(404).json("Establishment was not found");
        }
        if (event) {
            if (!mongoose_1.default.isValidObjectId(event)) {
                return res.status(400).json({ message: "ID d'événement invalide" });
            }
            const adExists = yield Ads_1.AdModel.findOne({ event });
            if (adExists) {
                return res.status(400).json({
                    message: "Une publicité pour cet événement existe déjà.",
                });
            }
            const eventFound = yield Event_1.default.findById(event);
            if (!eventFound) {
                return res.status(404).json({ message: "Événement non trouvé" });
            }
            finalTitle = eventFound.title;
            finalDescription = eventFound.description;
            if (Array.isArray(eventFound.image)) {
                imageUrls = eventFound.image;
            }
            else if (typeof eventFound.image === "string") {
                imageUrls = [eventFound.image];
            }
        }
        if (files && files.length > 0) {
            const uploadResults = yield Promise.all(files.map((file) => cloudinary.v2.uploader.upload(file.path, {
                folder: "localappy/ads",
            })));
            imageUrls = uploadResults.map((res) => res.secure_url);
            yield (0, cleanUploadedFiles_1.cleanUploadedFiles)(files);
        }
        if (!imageUrls.length) {
            return res.status(400).json({ message: "Aucune image fournie." });
        }
        const newAd = new Ads_1.AdModel({
            type,
            title: finalTitle,
            description: finalDescription,
            image: imageUrls,
            event: event !== null && event !== void 0 ? event : null,
        });
        yield newAd.save();
        establishmentFinded.ads.push(newAd._id);
        yield establishmentFinded.save();
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
        const ads = yield Ads_1.AdModel.find().sort({ createdAt: -1 });
        return res.status(200).json(ads);
    }
    catch (error) {
        console.error("Erreur récupération annonces :", error);
        return res
            .status(500)
            .json({ message: "Erreur récupération annonces", error });
    }
});
const getAdById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adId } = req.params;
        const { source } = req.query;
        if (!adId || adId.length !== 24) {
            return res.status(400).json({ message: "ID invalide" });
        }
        const ad = yield Ads_1.AdModel.findByIdAndUpdate(adId, {
            $push: {
                clics: {
                    source: typeof source === "string" ? source : "unknown",
                    date: new Date(),
                },
            },
        }, { new: true });
        if (!ad) {
            return res.status(404).json({ message: "Annonce non trouvée" });
        }
        return res.status(200).json(ad);
    }
    catch (error) {
        console.error("Erreur récupération annonce :", error);
        return res
            .status(500)
            .json({ message: "Erreur récupération annonce", error });
    }
});
const updateAd = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedAd = yield Ads_1.AdModel.findByIdAndUpdate(id, updateData, {
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
        const deletedAd = yield Ads_1.AdModel.findByIdAndDelete(id);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL0Fkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUF3QztBQUN4QywrREFBdUM7QUFDdkMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pDLG9FQUFpRTtBQUNqRSx3REFBMkM7QUFDM0MsNERBQW9DO0FBQ3BDLDRFQUFvRDtBQUdwRCxNQUFNLFFBQVEsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDckQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDckQsTUFBTSxLQUFLLEdBQ1QsQ0FBQSxNQUFDLEdBQUcsQ0FBQyxLQUFrRCwwQ0FBRSxJQUFJLEtBQUksRUFBRSxDQUFDO1FBRXRFLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLGdCQUFnQixHQUFHLFdBQVcsQ0FBQztRQUNuQyxJQUFJLFNBQVMsR0FBYSxFQUFFLENBQUM7UUFFN0IsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUN0RCxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDM0IsQ0FBQztRQUNGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLGdCQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDNUMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9B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