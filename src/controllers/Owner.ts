import { Request, Response } from "express";
import Owner from "../models/Owner"; // Modèle Owner
import Retour from "../library/Retour";
import Customer from "../models/Customer";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
// Créer un nouveau propriétaire (Owner)
import twilio from "twilio";

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const createOwner = async (req: Request, res: Response) => {
  try {
    const {
      email,
      name,
      firstname,
      customerId,
      phoneNumber,
      password,
      passwordConfirmed,
    } = req.body;

    if (
      !email ||
      !name ||
      !firstname ||
      !phoneNumber ||
      !password ||
      !passwordConfirmed
    ) {
      Retour.error("All fields are required");
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== passwordConfirmed) {
      Retour.error("Passwords do not match");
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const ownerFinded = await Owner.findOne({ email });
    if (ownerFinded) {
      Retour.error("Account already exists");
      return res.status(400).json({ error: "Account already exists" });
    }

    const customerFinded = await Customer.findById(customerId);
    if (!customerFinded) {
      Retour.error("Customer not found");
      return res.status(404).json({ error: "Customer not found" });
    }

    // Generate password hash and salt
    const token: string = uid2(26);
    const salt: string = uid2(26);
    const hash: string = SHA256(password + salt).toString(encBase64);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Vérifier et formater le numéro de téléphone si présent
    const formattedPhoneNumber = phoneNumber
      .replace(/\D/g, "")
      .replace(/^0/, "33");

    if (!/^(33)[6-7]\d{8}$/.test(formattedPhoneNumber)) {
      Retour.error("Invalid phone number format");
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Try to send the SMS first
    try {
      await client.messages.create({
        body: `Votre code d'activation est: ${verificationCode}`,
        from: "locaLappy",
        to: `+${formattedPhoneNumber}`, // Ensure phoneNumber is in international format
      });
    } catch (smsError) {
      console.error("Twilio error:", smsError);
      Retour.error("Twilio error");
      return res.status(500).json({
        error: "Failed to send SMS verification code",
        details: smsError,
      });
    }

    // Create new owner only after successful SMS sending
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
      isVerified: false,
      verificationCode,
      customerAccount: customerFinded,
    });

    await owner.save();

    Retour.info("Owner created. Verification code sent via SMS.");
    return res.status(201).json({
      message: "Owner created. Verification code sent via SMS.",
      ownerId: owner._id,
    });
  } catch (error) {
    console.error("Error creating owner:", error);
    Retour.error("Failed to create owner");
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
