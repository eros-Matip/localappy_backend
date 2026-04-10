import { Request, Response } from "express";
import { AdModel } from "../models/Ads";
import Retour from "../library/Retour";
const cloudinary = require("cloudinary");
import { cleanUploadedFiles } from "../utils/cleanUploadedFiles";
import mongoose, { Types } from "mongoose";
import Event from "../models/Event";
import Establishment from "../models/Establishment";

// CREATE
const createAd = async (req: Request, res: Response) => {
  try {
    const { type, title, description, event } = req.body;
    const files =
      (req.files as { [key: string]: Express.Multer.File[] })?.file || [];

    let finalTitle = title;
    let finalDescription = description;
    let imageUrls: string[] = [];

    const establishmentFinded = await Establishment.findById(
      req.params.establishmentId,
    );
    if (!establishmentFinded) {
      Retour.error("Establishment was not found");
      return res.status(404).json("Establishment was not found");
    }
    // 📦 Si event est présent, injecter ses infos
    if (event) {
      if (!mongoose.isValidObjectId(event)) {
        return res.status(400).json({ message: "ID d'événement invalide" });
      }

      const adExists = await AdModel.findOne({ event });
      if (adExists) {
        return res.status(400).json({
          message: "Une publicité pour cet événement existe déjà.",
        });
      }

      const eventFound = await Event.findById(event);
      if (!eventFound) {
        return res.status(404).json({ message: "Événement non trouvé" });
      }

      finalTitle = eventFound.title;
      finalDescription = eventFound.description;

      // Ajouter image(s) de l’événement si pas de fichiers
      if (Array.isArray(eventFound.image)) {
        imageUrls = eventFound.image;
      } else if (typeof eventFound.image === "string") {
        imageUrls = [eventFound.image];
      }
    }

    // 📸 Si des fichiers sont envoyés, ils remplacent les images de l’event
    if (files && files.length > 0) {
      const uploadResults = await Promise.all(
        files.map((file) =>
          cloudinary.v2.uploader.upload(file.path, {
            folder: "localappy/ads",
          }),
        ),
      );

      imageUrls = uploadResults.map((res) => res.secure_url);
      await cleanUploadedFiles(files);
    }

    // 🚫 Si aucune image trouvée du tout
    if (!imageUrls.length) {
      return res.status(400).json({ message: "Aucune image fournie." });
    }

    const newAd = new AdModel({
      type,
      title: finalTitle,
      description: finalDescription,
      image: imageUrls,
      event: event ?? null,
    });

    await newAd.save();
    establishmentFinded?.ads?.push(newAd._id as Types.ObjectId);
    await establishmentFinded.save();
    Retour.info("Ad created");
    return res.status(201).json(newAd);
  } catch (error) {
    console.error("Erreur création annonce :", error);
    return res.status(400).json({ message: "Erreur création annonce", error });
  }
};

// READ - get all ads
const getAds = async (_req: Request, res: Response) => {
  try {
    const ads = await AdModel.find().sort({ createdAt: -1 }); // tri récent → ancien
    return res.status(200).json(ads);
  } catch (error) {
    console.error("Erreur récupération annonces :", error);
    return res
      .status(500)
      .json({ message: "Erreur récupération annonces", error });
  }
};

// READ - get ad by id
const getAdById = async (req: Request, res: Response) => {
  try {
    const { adId } = req.params;
    const { source } = req.query; // ex: "mobile", "web", "home-screen"

    if (!adId || adId.length !== 24) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const ad = await AdModel.findByIdAndUpdate(
      adId,
      {
        $push: {
          clics: {
            source: typeof source === "string" ? source : "unknown",
            date: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!ad) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    return res.status(200).json(ad);
  } catch (error) {
    console.error("Erreur récupération annonce :", error);
    return res
      .status(500)
      .json({ message: "Erreur récupération annonce", error });
  }
};

// UPDATE ad by id
const updateAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedAd = await AdModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedAd) {
      return res
        .status(404)
        .json({ message: "Annonce non trouvée pour mise à jour" });
    }
    res.json(updatedAd);
  } catch (error) {
    res.status(400).json({ message: "Erreur mise à jour annonce", error });
  }
};

// DELETE ad by id
const deleteAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedAd = await AdModel.findByIdAndDelete(id);
    if (!deletedAd) {
      return res
        .status(404)
        .json({ message: "Annonce non trouvée pour suppression" });
    }
    res.json({ message: "Annonce supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression annonce", error });
  }
};

export default { createAd, getAds, getAdById, updateAd, deleteAd };
