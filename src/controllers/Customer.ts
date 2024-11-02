import { Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

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
    if (
      !email ||
      !name ||
      !firstname ||
      !phoneNumber ||
      !address ||
      !city ||
      !zip
    ) {
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

    // Appel à l'API gouvernementale pour récupérer les coordonnées de l'adresse
    const responseApiGouv = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${address} ${zip} ${city}`
    );

    const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
    const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];

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
        location: {
          lng: longitude,
          lat: latitude,
        },
      },
      premiumStatus: false,
      bills: [],
      eventsAttended: [], // Référence vers les événements auxquels le client a participé
      favorites: [], // Référence vers les établissements favoris du client
      token,
      hash,
      salt,
    });

    // Sauvegarde du client dans la base de données
    await customer.save();

    // Réponse avec le client créé
    return res.status(201).json({ message: "Customer created", customer });
  } catch (error) {
    Retour.error("Error catched");
    return res.status(500).json({ message: "Error catched", error });
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

    const { allInfos, newThemesFavorites } = req.body;

    if (!allInfos && !newThemesFavorites) {
      Retour.error("Nothing has changed");
      return res.status(400).json({ message: "Nothing has changed" });
    }

    // Mise à jour des données du client
    if (Array.isArray(newThemesFavorites)) {
      Object(customer).themesFavorites = newThemesFavorites;
    }

    if (allInfos) {
      customer.set(allInfos);
    }

    await customer.save();

    return res.status(200).json({ customer });
  } catch (error) {
    Retour.error("Error caught");
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
      action,
    } = req.body;

    // Vérification des données reçues
    if (!admin || !admin._id) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    if (
      (!eventsFavoritesArr || eventsFavoritesArr.length === 0) &&
      (!themesFavoritesArr || themesFavoritesArr.length === 0) &&
      (!customersFavoritesArr || customersFavoritesArr.length === 0) &&
      (!establishmentFavoritesArr || establishmentFavoritesArr.length === 0)
    ) {
      return res.status(400).json({ message: "No favorites data received" });
    }

    if (!["add", "remove"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Invalid action. Use 'add' or 'remove'." });
    }

    const customer = await Customer.findById(admin._id);
    if (!customer) {
      Retour.error("Customer was not found");
      return res.status(404).json({ message: "Customer was not found" });
    }

    const invalidIds: { type: string; id: string }[] = [];

    // Fonction pour ajouter ou retirer un favori d'un tableau donné
    const handleFavorites = async (
      arr: string[],
      customerFavorites: mongoose.Types.ObjectId[],
      model: any,
      type: string
    ) => {
      for (const id of arr) {
        if (mongoose.isValidObjectId(id)) {
          const exists = await model.exists({ _id: id });
          if (exists) {
            const objectId = new mongoose.Types.ObjectId(id);
            if (action === "add") {
              if (!customerFavorites.includes(objectId)) {
                customerFavorites.push(objectId);
              }
            } else if (action === "remove") {
              const index = customerFavorites.findIndex((favId) =>
                favId.equals(objectId)
              );
              if (index !== -1) {
                customerFavorites.splice(index, 1); // Supprime l'ID du tableau
              }
            }
          } else {
            invalidIds.push({ type, id });
          }
        } else {
          invalidIds.push({ type, id });
        }
      }
    };

    // Traitement des favoris
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
        "Theme"
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

    // Si des IDs invalides ont été trouvés, renvoie une réponse avec la liste
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "Some IDs do not correspond to valid entries",
        invalidIds,
      });
    }

    await customer.save();
    return res.status(200).json("Favorites updated");
  } catch (error) {
    Retour.error("Error occurred while updating favorites");
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
