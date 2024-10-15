import { Request, Response } from "express";
import Owner from "../models/Owner"; // Modèle Owner
import Retour from "../library/Retour";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
// Créer un nouveau propriétaire (Owner)
const createOwner = async (req: Request, res: Response) => {
  try {
    const { email, name, firstname, phoneNumber, password, passwordConfirmed } =
      req.body;

    const token: string = uid2(26);
    const salt: string = uid2(26);
    const hash: string = SHA256(password + salt).toString(encBase64);

    // Créer un nouvel Owner
    const ownerFinded = await Owner.findOne({ email });
    if (ownerFinded) {
      Retour.error("Account finded");
      return res.status(404).send("Account finded");
    }

    const owner = new Owner({
      email,
      account: {
        name,
        firstname,
        phoneNumber,
      },
      token,
      hash,
      salt,
      establishments: [],
    });

    if (password && password === passwordConfirmed) {
      // Sauvegarder dans la base de données
      await owner.save();
      // Retourner le propriétaire créé
      Retour.info("Owner created");
      return res.status(201).json(owner);
    } else {
      Retour.error("passwords arent similar");
      return res.status(404).json("passwords arent similar");
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to create owner", details: error });
  }
};

// Lire les informations d'un propriétaire par son ID
const getOwnerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer l'owner par son ID
    const owner = await Owner.findById(id).populate("establishments"); // Peuple les établissements associés
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Retourner le propriétaire trouvé
    return res.status(200).json(owner);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to retrieve owner", details: error });
  }
};

// Mettre à jour un propriétaire par son ID
const updateOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Mettre à jour l'owner par son ID
    const updatedOwner = await Owner.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    if (!updatedOwner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Retourner le propriétaire mis à jour
    return res.status(200).json(updatedOwner);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to update owner", details: error });
  }
};

// Supprimer un propriétaire par son ID
const deleteOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Supprimer l'owner par son ID
    const deletedOwner = await Owner.findByIdAndDelete(id);
    if (!deletedOwner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Retourner un message de succès après la suppression
    return res.status(200).json({ message: "Owner deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to delete owner", details: error });
  }
};
export default { createOwner, getOwnerById, updateOwner, deleteOwner };
