// Importations nécessaires
import { Request, Response } from "express";
import axios from "axios";
import Owner from "../models/Owner"; // Modèle Mongoose pour le propriétaire
import Establishment from "../models/Establishment"; // Modèle Mongoose pour l'établissement
import Retour from "../library/Retour";
import config from "../config/config";
const cloudinary = require("cloudinary");

// Fonction pour créer un nouvel établissement avec les données récupérées depuis l'INSEE
const createEstablishment = async (req: Request, res: Response) => {
  const {
    activity,
    website,
    facebook,
    instagram,
    twitter,
    adressLabel,
    society,
    siret,
    adress,
    city,
    zip,
    activityCodeNAF,
  } = req.body;

  if (
    !activity ||
    !adressLabel ||
    !society ||
    !siret ||
    !adress ||
    !city ||
    !zip
  ) {
    Retour.warn("Some value is missing");
    return res.status(404).json({ message: "Some value is missing" });
  }
  console.log(Object(req.files).file);

  if (!Object(req.files).file) {
    Retour.warn("KBis is missing");
    return res.status(400).json({ message: "KBis is missing" });
  }
  // Récupération des informations de l'établissement dans req.body
  const fileKeys = req.files ? Object(req.files).file : []; // Récupérer le fichier KBis envoyé

  try {
    // Vérifier si le propriétaire existe dans la base de données
    const owner = await Owner.findById(req.body.owner);

    if (!owner) {
      Retour.warn("Owner not found");
      return res.status(404).json({ message: "Owner not found" });
    }

    // Vérifier si le propriétaire est validé
    if (!owner.isVerified) {
      Retour.warn("Owner not verified");
      return res.status(400).json({ message: "Owner not verified" });
    }

    // Chemin du dossier Cloudinary pour cet Owner
    const cloudinaryFolder = `${owner.account.firstname}_${owner.account.name}_folder`;

    // Téléchargement du fichier KBis (s'il est fourni)
    let kbisUploadResult = null;
    if (fileKeys.length > 0) {
      kbisUploadResult = await cloudinary.v2.uploader.upload(fileKeys[0].path, {
        folder: cloudinaryFolder, // Télécharger dans le dossier spécifique de l'owner
        public_id: "KBis", // Nom du fichier
        resource_type: "image", // Spécifier que c'est une image
      });
    }

    // Obtenir les coordonnées de l'adresse via l'API adresse.data.gouv.fr
    const responseApiGouv = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        adressLabel
      )}`
    );

    if (!responseApiGouv.data.features.length) {
      Retour.warn("Invalid address, no coordinates found.");
      return res
        .status(400)
        .json({ message: "Invalid address, no coordinates found." });
    }

    const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
    const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];

    // Vérifier si un établissement avec le même nom et la même localisation existe déjà
    const existingEstablishment = await Establishment.findOne({
      name: society,
      siret: siret,
    });

    if (existingEstablishment) {
      Retour.warn("An establishment with the same name already exists");
      return res.status(409).json({
        message: "An establishment with the same name already exists",
      });
    }

    // Créer un nouvel établissement avec les données de l'INSEE et les données utilisateur
    const establishment = new Establishment({
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
          : null, // Enregistrer les infos Cloudinary pour le KBis
        activityCodeNAF: activityCodeNAF,
      },
      owner: owner._id,
      events: [],
    });

    // Sauvegarder l'établissement dans la base de données
    await establishment.save();

    // Ajouter l'établissement à la liste des établissements du propriétaire
    owner.establishments.push(Object(establishment)._id);
    await owner.save();

    // Retourner la réponse avec l'établissement créé
    Retour.info("Establishment created successfully");
    return res.status(201).json({
      message: "Establishment created successfully",
      establishment,
    });
  } catch (error) {
    Retour.error(`Error creating establishment: ${error}`);
    return res.status(500).json({
      error: "Failed to create establishment",
      details: error,
    });
  }
};

// Fonction pour lire les informations d'un établissement par son ID
const getEstablishmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Extraire l'ID de l'établissement depuis les paramètres de l'URL
    const establishment = await Establishment.findById(id).populate("owner"); // Récupérer l'établissement et peupler le champ "owner"
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // Retourner les informations de l'établissement
    return res.status(200).json(establishment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve establishment" });
  }
};

// Fonction pour mettre à jour un établissement
const updateEstablishment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Extraire l'ID de l'établissement à mettre à jour
    const updatedData = req.body; // Extraire les nouvelles données de la requête

    // Trouver et mettre à jour l'établissement avec les nouvelles données
    const updatedEstablishment = await Establishment.findByIdAndUpdate(
      id,
      updatedData,
      { new: true } // Option pour retourner l'établissement mis à jour
    );
    if (!updatedEstablishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // Retourner l'établissement mis à jour
    return res.status(200).json(updatedEstablishment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update establishment" });
  }
};

// Fonction pour supprimer un établissement
const deleteEstablishment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Extraire l'ID de l'établissement à supprimer

    // Trouver et supprimer l'établissement
    const deletedEstablishment = await Establishment.findByIdAndDelete(id);
    if (!deletedEstablishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // Optionnel : Retirer l'établissement de la liste des établissements du propriétaire
    await Owner.updateOne(
      { establishments: id },
      { $pull: { establishments: id } }
    );

    // Retourner un message de succès après suppression
    return res.status(200).json({ message: "Establishment deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete establishment" });
  }
};

export default {
  createEstablishment,
  getEstablishmentById,
  updateEstablishment,
  deleteEstablishment,
};
