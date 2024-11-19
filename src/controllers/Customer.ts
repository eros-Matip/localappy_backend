import { Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const cloudinary = require("cloudinary");

// Models
import Customer from "../models/Customer";
import Retour from "../library/Retour";
import axios from "axios";
import mongoose from "mongoose";
import Event from "../models/Event";
import Theme from "../models/Theme";
import Establishment from "../models/Establishment";

const createCustomer = async (req: Request, res: Response) => {
  try {
    const {
      email,
      name,
      firstname,
      address,
      city,
      zip,
      phoneNumber,
      password,
      passwordConfirmed,
    } = req.body;

    // Vérification que les champs requis sont remplis
    if (!email || !name || !firstname) {
      Retour.error("Some value is missing");
      return res.status(400).json({ message: "Some value is missing" });
    }

    // Vérification que les mots de passe correspondent
    if (!password || password !== passwordConfirmed) {
      Retour.error("Passwords aren't confirmed");
      return res.status(400).json({ message: "Passwords aren't confirmed" });
    }

    // Vérifier si un client avec cet email existe déjà
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      Retour.error("Customer already exists");
      return res.status(400).json({ message: "Customer already exists" });
    }

    // Génération du token, du salt et du hash pour le mot de passe
    const token: string = uid2(26);
    const salt: string = uid2(26);
    const hash: string = SHA256(password + salt).toString(encBase64);

    // Coordonnées par défaut (null si l'adresse n'est pas fournie)
    let latitude: number | null = null;
    let longitude: number | null = null;

    // Si l'adresse est fournie, appel à l'API gouvernementale pour récupérer les coordonnées
    if (address && city && zip) {
      try {
        const responseApiGouv = await axios.get(
          `https://api-adresse.data.gouv.fr/search/?q=${address} ${zip} ${city}`
        );

        // Vérifie que l'API a retourné des données valides
        if (responseApiGouv.data.features.length > 0) {
          latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
          longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        } else {
          Retour.error("No coordinates found for the provided address");
        }
      } catch (apiError) {
        Retour.error("Error calling government API for address coordinates");
        return res
          .status(500)
          .json({ message: "Error with address API", error: apiError });
      }
    }

    // Création d'un nouveau client
    const customer = new Customer({
      email,
      account: {
        name,
        firstname,
        phoneNumber,
        address,
        zip,
        city,
        location:
          latitude && longitude ? { lng: longitude, lat: latitude } : undefined,
      },
      premiumStatus: false,
      bills: [],
      eventsAttended: [],
      favorites: [],
      token,
      hash,
      salt,
    });

    // Sauvegarde du client dans la base de données
    await customer.save();

    // Réponse avec le client créé
    return res
      .status(201)
      .json({ message: "Customer created", customer: customer });
  } catch (error) {
    Retour.error("Error caught during customer creation");
    return res.status(500).json({ message: "Error caught", error });
  }
};

const readCustomer = async (req: Request, res: Response) => {
  const customerId = req.params.customerId;

  try {
    const customer = await Customer.findById(customerId);
    return customer
      ? res.status(200).json({ message: customer })
      : res.status(404).json({ message: "Not found" });
  } catch (error) {
    Retour.error("Error catched");
    return res.status(500).json({ message: "Error catched", error });
  }
};

const readAll = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find();
    return res.status(200).json({ message: customers });
  } catch (error) {
    Retour.error("Error catched");
    return res.status(500).json({ message: "Error catched", error });
  }
};

const updateCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = req.params.customerId;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer was not found" });
    }

    const { allInfos } = req.body;
    const fileKeys = req.files ? Object(req.files).file : [];
    if (!allInfos && !fileKeys.length) {
      console.error("Nothing has changed");
      return res.status(400).json({ message: "Nothing has changed" });
    }

    // Mise à jour des informations textuelles si présentes
    if (allInfos) {
      customer.set(allInfos);
    }

    // Si un fichier est présent dans la requête, upload sur Cloudinary
    if (fileKeys.length) {
      // Boucle pour gérer plusieurs fichiers potentiels (le dernier sera pris en compte pour la photo de profil)
      for (const file of fileKeys) {
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "customer_profiles",
        });

        // Mise à jour de la photo de profil avec le dernier fichier téléchargé
        customer.picture = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
    }

    // Sauvegarde des modifications
    await customer.save();

    return res
      .status(200)
      .json({ message: "Customer picture's updated", customer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({ message: "Error caught", error });
  }
};

const addingOrRemoveFavorites = async (req: Request, res: Response) => {
  try {
    const {
      admin,
      eventsFavoritesArr,
      themesFavoritesArr,
      customersFavoritesArr,
      establishmentFavoritesArr,
      descriptif,
      action,
    } = req.body;

    if (!admin || !admin._id) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    const customer = await Customer.findById(admin._id);
    if (!customer) {
      return res.status(404).json({ message: "Customer was not found" });
    }

    if (
      (!eventsFavoritesArr || eventsFavoritesArr.length === 0) &&
      (!themesFavoritesArr || themesFavoritesArr.length === 0) &&
      (!customersFavoritesArr || customersFavoritesArr.length === 0) &&
      (!establishmentFavoritesArr || establishmentFavoritesArr.length === 0)
    ) {
      if (descriptif) {
        customer.descriptif = descriptif;
      } else {
        return res.status(400).json({ message: "No favorites data received" });
      }
    }

    if (!["add", "remove"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Invalid action. Use 'add' or 'remove'." });
    }

    const invalidIds: { type: string; id: string }[] = [];

    const handleFavorites = async (
      arr: string[],
      customerFavorites: mongoose.Types.ObjectId[],
      model: any,
      type: string,
      field?: string
    ) => {
      for (const value of arr) {
        let target;
        if (field) {
          target = await model.findOne({ [field]: value }); // Recherche par champ (ex : theme)
        } else if (mongoose.isValidObjectId(value)) {
          target = await model.findById(value); // Recherche par ID
        }

        if (target) {
          const objectId = target._id;
          if (action === "add") {
            if (!customerFavorites.some((favId) => favId.equals(objectId))) {
              customerFavorites.push(objectId);
            }
            // Ajouter le client dans `favorieds` de l'événement
            if (type === "Event") {
              await model.findByIdAndUpdate(objectId, {
                $addToSet: { favorieds: customer._id },
              });
            }
          } else if (action === "remove") {
            const index = customerFavorites.findIndex((favId) =>
              favId.equals(objectId)
            );
            if (index !== -1) {
              customerFavorites.splice(index, 1);
            }
            // Retirer le client de `favorieds` de l'événement
            if (type === "Event") {
              await model.findByIdAndUpdate(objectId, {
                $pull: { favorieds: customer._id },
              });
            }
          }
        } else {
          invalidIds.push({ type, id: value });
        }
      }
    };

    if (eventsFavoritesArr) {
      await handleFavorites(
        eventsFavoritesArr,
        Object(customer).eventsFavorites,
        Event,
        "Event"
      );
    }
    if (themesFavoritesArr) {
      await handleFavorites(
        themesFavoritesArr,
        Object(customer).themesFavorites,
        Theme,
        "Theme",
        "theme" // Recherche par le champ `theme`
      );
    }
    if (customersFavoritesArr) {
      await handleFavorites(
        customersFavoritesArr,
        Object(customer).customersFavorites,
        Customer,
        "Customer"
      );
    }
    if (establishmentFavoritesArr) {
      await handleFavorites(
        establishmentFavoritesArr,
        Object(customer).establishmentFavorites,
        Establishment,
        "Establishment"
      );
    }

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "Some IDs do not correspond to valid entries",
        invalidIds,
      });
    }

    await customer.save();
    return res.status(200).json({ message: "Favorites updated", customer });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error occurred while updating favorites", error });
  }
};

const deleteCustomer = async (req: Request, res: Response) => {
  const customerId = req.params.customerId;

  return Customer.findByIdAndDelete(customerId)
    .then((customer) =>
      customer
        ? res.status(200).json({ message: "CRE is deleted" })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => {
      Retour.error("Error catched");
      return res.status(500).json({ message: "Error catched", error });
    });
};

export default {
  createCustomer,
  readCustomer,
  readAll,
  updateCustomer,
  addingOrRemoveFavorites,
  deleteCustomer,
};
