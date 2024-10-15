// Importations nécessaires
import { Request, Response } from "express";
import axios from "axios";
import Owner from "../models/Owner"; // Modèle Mongoose pour le propriétaire
import Establishment from "../models/Establishment"; // Modèle Mongoose pour l'établissement
import Retour from "../library/Retour";
import config from "../config/config";

// Fonction pour créer un nouvel établissement avec les données récupérées depuis l'INSEE
const createEstablishment = async (req: Request, res: Response) => {
  const { ownerId, activity, website, facebook, instagram, twitter, siret } =
    req.body;

  try {
    // Vérifier si le propriétaire existe dans la base de données
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Vérifier si le propriétaire est validé
    if (!owner.isValidated) {
      return res.status(400).json({ message: "Owner not validated" });
    }

    // Obtenir le token OAuth2 de l'API INSEE
    const tokenResponse = await axios.post(
      "https://api.insee.fr/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: `${config.apiSiret}`,
        client_secret: `${config.apiSiretSecret}`,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // Utiliser le token pour interroger l'API INSEE et récupérer les informations de l'entreprise
    const entrepriseResponse = await axios.get(
      `https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const entreprise = entrepriseResponse.data;

    // Vérifier que les informations de l'entreprise ont bien été récupérées
    if (!entreprise) {
      return res.status(404).json({
        message: "establishment not found in INSEE database",
      });
    }

    // Construire l'adresse et interroger l'API gouv pour la localisation
    let address = `${entreprise.etablissement.adresseEtablissement.numeroVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.typeVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.libelleVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.codePostalEtablissement} ${entreprise.etablissement.adresseEtablissement.libelleCommuneEtablissement}`;
    const responseApiGouv = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${address}`
    );

    const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
    const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];

    // Vérifier si un établissement avec le même nom et la même localisation existe déjà
    const existingEstablishment = await Establishment.findOne({
      name: entreprise.etablissement.uniteLegale.denominationUniteLegale,
      location: {
        lat: latitude,
        lng: longitude,
      },
    });

    if (existingEstablishment) {
      return res.status(409).json({
        message:
          "An establishment with the same name and location already exists",
      });
    }

    // Créer un nouvel établissement en utilisant les données de l'INSEE et les données envoyées dans la requête
    const establishment = new Establishment({
      name: entreprise.etablissement.uniteLegale.denominationUniteLegale,
      type: activity,
      address: {
        street: `${entreprise.etablissement.adresseEtablissement.numeroVoieEtablissement && entreprise.etablissement.adresseEtablissement.numeroVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.typeVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.libelleVoieEtablissement}`,
        city: entreprise.etablissement.adresseEtablissement
          .libelleCommuneEtablissement,
        postalCode:
          entreprise.etablissement.adresseEtablissement.codePostalEtablissement,
        country: "FRANCE",
      },
      location: {
        lat: latitude,
        lng: longitude,
      },
      contact: {
        website: website,
        socialMedia: { facebook, instagram, twitter },
      },
      legalInfo: {
        registrationNumber: siret,
      },
      owner: owner._id,
      events: [],
    });

    // Sauvegarder le nouvel établissement dans la base de données
    await establishment.save();

    // Ajouter l'établissement à la liste des établissements du propriétaire
    owner.establishments.push(Object(establishment)._id);
    await owner.save();

    // Retourner la réponse avec toutes les informations de l'établissement et les données INSEE récupérées
    return res.status(201).json({ establishment, entreprise });
  } catch (error) {
    console.error(`Error creating establishment: ${error}`);
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
