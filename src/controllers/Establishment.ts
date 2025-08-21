// Importations nécessaires
import { Request, Response } from "express";
import axios from "axios";
import Owner from "../models/Owner"; // Modèle Mongoose pour le propriétaire
import Establishment from "../models/Establishment"; // Modèle Mongoose pour l'établissement
import Retour from "../library/Retour";
import path from "path";
import fs from "fs";
import IEvent from "../interfaces/Event";
import slugify from "slugify";
import mongoose, { Types } from "mongoose";
import Registration from "../models/Registration";
import Customer from "../models/Customer";

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

// 📂 Définition du chemin des fichiers JSON
// const ENTREPRISES_DIR = path.join(__dirname, "../../Entreprises/objects");

// 📂 Fonction pour récupérer tous les fichiers JSON
const getAllFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory).flatMap((item) => {
    const fullPath = path.join(directory, item);
    if (fs.lstatSync(fullPath).isDirectory()) {
      return getAllFiles(fullPath);
    }
    return fullPath.endsWith(".json") ? [fullPath] : [];
  });
};

const getAllInformation = async (req: Request, res: Response) => {
  try {
    const establishmentFinded = await Establishment.findById(
      req.params.establishmentId
    ).populate({
      path: "events",
      model: "Event",
      // On ne filtre pas : on veut aussi les événements terminés
      populate: { path: "registrations", select: "quantity" },
    });

    if (!establishmentFinded || !establishmentFinded.events) {
      return res.status(404).json({ error: "Etablissement introuvable" });
    }

    // IMPORTANT : on ne change pas la forme du return (mêmes clés top-level)
    const statsByCategory: Record<string, number> = {
      publicités: 0,
      scannés: 0,
      promotions: 0,
      inscriptions: 0, // ← deviendra total des places réservées (somme des quantities)
      clics: 0,
    };

    const events = (establishmentFinded.events as unknown as IEvent[]).map(
      (evt: any) => {
        // 1) clics (hors "inscriptions" qui sera calculé via registrations)
        if (Array.isArray(evt.clics)) {
          for (const c of evt.clics) {
            switch (c?.source?.toLowerCase()) {
              case "publicités":
                statsByCategory.publicités++;
                break;
              case "scannés":
                statsByCategory.scannés++;
                break;
              case "promotions":
                statsByCategory.promotions++;
                break;
              case "inscriptions":
                // ignoré ici : on remplace par les vraies inscriptions (places)
                break;
              default:
                statsByCategory.clics++;
                break;
            }
          }
        }

        // 2) vraies inscriptions = somme des quantities
        const registrationsCount = Array.isArray(evt.registrations)
          ? evt.registrations.reduce(
              (sum: number, r: any) => sum + (r?.quantity || 0),
              0
            )
          : 0;

        statsByCategory.inscriptions += registrationsCount;

        // On enrichit l'event retourné avec un champ dérivé sans changer les clés top-level
        const base = typeof evt.toObject === "function" ? evt.toObject() : evt;
        return { ...base, registrationsCount };
      }
    );

    return res.status(200).json({
      establishment: establishmentFinded,
      totalEvents: events.length,
      statsByCategory, // ← "inscriptions" = total des places réservées
      events, // ← chaque event contient registrationsCount
    });
  } catch (error) {
    console.error("Erreur getAllInformation:", error);
    return res.status(500).json({
      error:
        "Échec lors de la récupération des informations de l'établissement.",
    });
  }
};

const getPublicInformation = async (req: Request, res: Response) => {
  try {
    const establishment = await Establishment.findById(
      req.params.establishmentId
    )
      .select(
        "name description address location photos openingHours logo events contact acceptedPayments"
      )
      .populate({
        path: "events",
        match: {
          isDraft: false,
          endingDate: { $gt: new Date() }, // → événements non passés
        },
        options: {
          sort: { startingDate: 1, endingDate: 1 }, // → tri par date de début
        },
      });

    if (!establishment || !Array.isArray(establishment.events)) {
      return res
        .status(404)
        .json({ error: "Établissement introuvable ou sans événements." });
    }

    const events = establishment.events;

    return res.status(200).json({
      totalEvents: events.length,
      establishment,
    });
  } catch (error) {
    Retour.error(`Erreur getPublicInformation: ${error}`);
    return res.status(500).json({
      error: "Erreur lors de la récupération des données publiques.",
    });
  }
};

// Fonction pour mettre à jour un établissement
// 🔧 Supprime les clés undefined dans un objet
const removeUndefined = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

const extractPublicId = (url: string): string | null => {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((p) => p === "upload") + 1;
    const publicIdWithExt = parts.slice(uploadIndex).join("/");
    return publicIdWithExt.replace(/\.[^/.]+$/, ""); // Supprime l'extension
  } catch {
    return null;
  }
};

const updateEstablishment = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;
    const updates = req.body;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // ✅ Parse automatique si `FormData` (stringifiés)
    ["openingHours", "address"].forEach((key) => {
      if (typeof updates[key] === "string") {
        try {
          updates[key] = JSON.parse(updates[key]);
        } catch (err) {
          console.warn(`Erreur de parsing du champ ${key}`, err);
        }
      }
    });

    // 🔁 Gestion des fichiers photos
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })
      ?.photos;
    const uploadedUrls: string[] = [];

    if (files && files.length > 0) {
      const folderName = slugify(establishment.name, {
        lower: true,
        strict: true,
      });

      // 🧹 Supprimer les anciennes images
      if (establishment.photos?.length) {
        for (const url of establishment.photos) {
          const publicId = extractPublicId(url);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }

      // 📤 Upload des nouvelles images
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `establishments/${folderName}`,
        });
        uploadedUrls.push(result.secure_url);
      }

      establishment.photos = uploadedUrls;
    }

    // 🌍 Géolocalisation si adresse complète
    if (
      updates.address &&
      typeof updates.address === "object" &&
      updates.address.street &&
      updates.address.city &&
      updates.address.postalCode
    ) {
      const { street, city, postalCode } = updates.address;
      const fullAddress = `${street}, ${postalCode} ${city}`;

      try {
        const { data } = await axios.get(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
        );

        if (data?.features?.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          establishment.location = { lat, lng };

          const context = data.features[0].properties.context;
          const department = context.split(",")[1]?.trim() || "";
          const region = context.split(",")[2]?.trim() || "";

          establishment.address = {
            ...(establishment.address || {}),
            street,
            city,
            postalCode,
            department,
            region,
            country: "France",
          };
        }
      } catch (err) {
        console.warn("Erreur API adresse.gouv.fr :", err);
      }
    }

    // 🔄 Mise à jour sécurisée des autres champs
    for (const key in updates) {
      const value = updates[key];

      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        value !== null
      ) {
        const cleanValue = removeUndefined(value);
        (establishment as any)[key] = {
          ...((establishment as any)[key] ?? {}),
          ...cleanValue,
        };
      } else {
        (establishment as any)[key] = value;
      }
    }

    // Si le client envoie staff en JSON string (form-data), on parse
    if (typeof updates.staff === "string") {
      try {
        updates.staff = JSON.parse(updates.staff);
      } catch {
        /* ignore */
      }
    }

    if (updates.staff !== undefined) {
      // Empêche la boucle générique d'écraser le résultat
      const staffPayload = updates.staff;
      delete updates.staff;

      // Helpers
      const toObjectIds = (input: any): mongoose.Types.ObjectId[] => {
        const arr = Array.isArray(input) ? input : [input];
        return arr
          .map((v) => (typeof v === "string" ? v.trim() : v))
          .filter((v) => mongoose.isValidObjectId(v))
          .map((v) => new mongoose.Types.ObjectId(v));
      };

      const ensureExistingCustomers = async (
        ids: mongoose.Types.ObjectId[]
      ) => {
        if (!ids.length) return [];
        const existing = await Customer.find({ _id: { $in: ids } }).select(
          "_id"
        );
        const keep = new Set(existing.map((d) => String(d._id)));
        return ids.filter((id) => keep.has(String(id)));
      };

      const uniq = (ids: mongoose.Types.ObjectId[]) => {
        const seen = new Set<string>();
        const out: mongoose.Types.ObjectId[] = [];
        for (const id of ids) {
          const s = String(id);
          if (!seen.has(s)) {
            seen.add(s);
            out.push(id);
          }
        }
        return out;
      };

      // État courant normalisé
      const current: mongoose.Types.ObjectId[] = Array.isArray(
        establishment.staff
      )
        ? establishment.staff.map((id: any) => new mongoose.Types.ObjectId(id))
        : [];

      // --- Traite les différents formats ---
      if (Array.isArray(staffPayload)) {
        // Remplacement complet
        let setIds = await ensureExistingCustomers(toObjectIds(staffPayload));
        establishment.staff = uniq(setIds);
      } else if (staffPayload && typeof staffPayload === "object") {
        // Remplacement explicite
        if (Array.isArray(staffPayload.set)) {
          let setIds = await ensureExistingCustomers(
            toObjectIds(staffPayload.set)
          );
          establishment.staff = uniq(setIds);
        } else {
          // Ajouts incrémentaux
          if (Array.isArray(staffPayload.add)) {
            let addIds = await ensureExistingCustomers(
              toObjectIds(staffPayload.add)
            );
            establishment.staff = uniq([...current, ...addIds]);
          }
          // Retraits incrémentaux
          if (Array.isArray(staffPayload.remove)) {
            const removeSet = new Set(
              toObjectIds(staffPayload.remove).map(String)
            );
            establishment.staff = current.filter(
              (id) => !removeSet.has(String(id))
            );
          }
        }
      } else {
        console.warn(
          "[updateEstablishment] 'staff' doit être un tableau d'IDs ou un objet { add/remove/set }."
        );
      }
    }

    const updated = await establishment.save();
    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update error:", error);
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
  getAllInformation,
  getPublicInformation,
  // fetchEstablishmentsByJson,
  updateEstablishment,
  deleteEstablishment,
};
