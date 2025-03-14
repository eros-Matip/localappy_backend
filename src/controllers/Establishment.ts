// Importations nécessaires
import { Request, Response } from "express";
import axios from "axios";
import Owner from "../models/Owner"; // Modèle Mongoose pour le propriétaire
import Establishment from "../models/Establishment"; // Modèle Mongoose pour l'établissement
import Retour from "../library/Retour";
import path from "path";
import fs from "fs";

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
const ENTREPRISES_DIR = path.join(__dirname, "../../Entreprises/objects");

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

// 📌 Route pour récupérer et stocker les établissements
const fetchEstablishmentsByJson = async (req: Request, res: Response) => {
  try {
    console.log(`📂 Recherche des fichiers JSON dans ${ENTREPRISES_DIR}`);

    const allFiles = getAllFiles(ENTREPRISES_DIR);

    if (allFiles.length === 0) {
      return res.status(404).json({
        message: "Aucun fichier JSON trouvé dans Entreprises/objects.",
      });
    }

    const updatedEstablishments: any[] = [];
    const createdEstablishments: any[] = [];
    const unmatchedFiles: string[] = [];

    for (const file of allFiles) {
      try {
        console.info(`📂 Traitement du fichier : ${file}`);

        const fileContent = fs.readFileSync(file, "utf8").trim();
        if (!fileContent) {
          console.warn(`⚠️ Fichier vide ignoré : ${file}`);
          continue;
        }

        let jsonData;
        try {
          jsonData = JSON.parse(fileContent);
        } catch (error) {
          console.error(`❌ JSON invalide dans ${file} :`, error);
          continue;
        }
        // 🔄 Convertir les objets uniques en tableaux
        const normalizedData = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (const obj of normalizedData) {
          try {
            // 🔍 Extraction des données
            const establishmentName =
              obj["rdfs:label"]?.fr?.[0] || "Nom inconnu";
            const city =
              obj["isLocatedAt"]?.[0]?.["schema:address"]?.[0]?.[
                "schema:addressLocality"
              ] || "";
            const street =
              obj["isLocatedAt"]?.[0]?.["schema:address"]?.[0]?.[
                "schema:streetAddress"
              ]?.[0] || "";
            const postalCode =
              obj["isLocatedAt"]?.[0]?.["schema:address"]?.[0]?.[
                "schema:postalCode"
              ] || "";
            const department =
              obj["isLocatedAt"]?.[0]?.["isPartOfDepartment"]?.["rdfs:label"]
                ?.fr?.[0] || "Département inconnu";
            const region =
              obj["isLocatedAt"]?.[0]?.["isPartOfDepartment"]?.[
                "isPartOfRegion"
              ]?.["rdfs:label"]?.fr?.[0] || "Région inconnue";
            const latitude =
              obj["isLocatedAt"]?.[0]?.["schema:geo"]?.["schema:latitude"] || 0;
            const longitude =
              obj["isLocatedAt"]?.[0]?.["schema:geo"]?.["schema:longitude"] ||
              0;
            const description =
              obj["hasDescription"]?.[0]?.["dc:description"]?.fr?.[0] || "";
            const types = obj["@type"] || [];
            const lastUpdate = obj["lastUpdate"]
              ? new Date(obj["lastUpdate"])
              : new Date();
            const creationDate = obj["creationDate"]
              ? new Date(obj["creationDate"])
              : new Date();

            // 📌 Contact
            const contact = {
              email: obj["hasContact"]?.[0]?.["schema:email"]?.[0] || "",
              telephone:
                obj["hasContact"]?.[0]?.["schema:telephone"]?.[0] || "",
              fax: obj["hasContact"]?.[0]?.["schema:faxNumber"]?.[0] || "",
              website: obj["hasBeenCreatedBy"]?.["foaf:homepage"]?.[0] || "",
            };
            // 📌 Image (Logo)
            const logo =
              obj["hasMainRepresentation"]?.[0]?.[
                "ebucore:hasRelatedResource"
              ]?.[0]?.["ebucore:locator"]?.[0] || "";

            // 📌 Horaires d'ouverture
            const openingHours =
              obj["isLocatedAt"]?.[0]?.[
                "schema:openingHoursSpecification"
              ]?.map((hour: any) => ({
                dayOfWeek: hour["@type"]?.[0] || "Jour inconnu",
                opens: hour["schema:opens"] || "06:00",
                closes: hour["schema:closes"] || "23:00",
              })) || [];

            console.log(
              `✅ Traitement de l'établissement : ${establishmentName}`
            );

            // 📌 Vérifier si l'établissement existe déjà
            let dbEstablishment = await Establishment.findOne({
              name: establishmentName,
              "address.city": city,
            });

            if (!dbEstablishment) {
              // 🆕 Création d'un nouvel établissement
              const newEstablishment = new Establishment({
                name: establishmentName,
                type: types,
                creationDate,
                lastUpdate,
                address: {
                  street,
                  city,
                  postalCode,
                  department,
                  region,
                  country: "France",
                },
                location: { lat: latitude, lng: longitude },
                contact,
                description,
                openingHours,
                logo,
              });
              await newEstablishment.save();
              createdEstablishments.push({
                id: newEstablishment._id,
                name: newEstablishment.name,
              });
              console.info(
                `✅ Nouvel établissement ajouté : ${newEstablishment.name}`
              );
            } else {
              // 🔄 Mise à jour des informations existantes
              dbEstablishment.lastUpdate = lastUpdate;
              dbEstablishment.description =
                description || dbEstablishment.description;
              dbEstablishment.location = { lat: latitude, lng: longitude };
              dbEstablishment.address = {
                street,
                city,
                postalCode,
                department,
                region,
                country: "France",
              };
              dbEstablishment.contact = contact;
              dbEstablishment.openingHours = openingHours;
              dbEstablishment.logo = logo;

              await dbEstablishment.save();
              updatedEstablishments.push({
                id: dbEstablishment._id,
                name: dbEstablishment.name,
              });
              console.info(
                `♻️ Établissement mis à jour : ${dbEstablishment.name}`
              );
            }
          } catch (error) {
            console.error(`❌ Erreur lors du traitement de ${file} :`, error);
          }
        }
      } catch (error) {
        unmatchedFiles.push(file);
        console.error(`❌ Erreur de lecture du fichier ${file} :`, error);
      }
    }

    return res.status(200).json({
      message: "Traitement terminé.",
      updatedEstablishments,
      createdEstablishments,
      unmatchedFiles,
    });
  } catch (error) {
    console.error("❌ Erreur globale :", error);
    return res
      .status(500)
      .json({ message: "Erreur lors du traitement.", error });
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
  fetchEstablishmentsByJson,
  updateEstablishment,
  deleteEstablishment,
};
