import { Request, Response } from "express";
import Owner from "../models/Owner"; // Modèle Owner
import Retour from "../library/Retour";
import Customer from "../models/Customer";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
// Créer un nouveau propriétaire (Owner)
import twilio from "twilio";
import { Job, Agenda } from "agenda";
import config from "../config/config";
import Admin from "../models/Admin";
import { notifyAdminsNewOwner } from "../services/notifyAdmins";

const cloudinary = require("cloudinary");

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Configurer Agenda avec MongoDB
const agenda = new Agenda({ db: { address: `${config.mongooseUrl}` } });

// Définir la tâche de suppression
agenda.define("delete unverified owner", async (job: Job) => {
  try {
    const { ownerId } = job.attrs.data as { ownerId: string };

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      Retour.log(`Owner with ID ${ownerId} not found. No action taken.`);
      return;
    }

    if (owner.isVerified) {
      Retour.log(`Owner with ID ${ownerId} is verified. No action taken.`);
      return;
    }

    Retour.log(`Unverified owner ${owner.email} deleted after 1 hour.`);

    // 1) Supprimer le fichier CNI (si présent)
    if (owner.cni?.public_id) {
      await cloudinary.uploader.destroy(owner.cni.public_id);
      Retour.log(`Deleted CNI file: ${owner.cni.public_id}`);
    }

    // 2) Supprimer le contenu du dossier puis le dossier
    const folderName = `${owner.account.firstname}_${owner.account.name}_folder`;

    // cloudinary.api.resources peut throw si folder vide/inexistant -> on protège
    try {
      const { resources } = await cloudinary.api.resources({
        type: "upload",
        prefix: folderName,
        max_results: 500,
      });

      for (const file of resources) {
        await cloudinary.uploader.destroy(file.public_id);
      }

      // delete_folder peut throw si déjà supprimé / inexistant
      await cloudinary.api.delete_folder(folderName);
      Retour.log(`Deleted Cloudinary folder: ${folderName}`);
    } catch (e) {
      console.warn(`Cloudinary cleanup warning for folder ${folderName}:`, e);
    }

    // 3) Détacher le customer (sans crash si pas trouvé)
    const customerFinded = await Customer.findOne({ ownerAccount: owner._id });
    if (customerFinded) {
      customerFinded.ownerAccount = null;
      await customerFinded.save();
    }

    // 4) Supprimer l’owner
    await owner.deleteOne();
  } catch (error) {
    const ownerId = (job.attrs.data as any)?.ownerId;
    Retour.error(`Failed to delete unverified owner with ID ${ownerId}`);
    console.error(
      `Failed to delete unverified owner with ID ${ownerId}:`,
      error,
    );
  }
});

const createOwner = async (req: Request, res: Response) => {
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

    // ✅ fichier optionnel
    const fileKeys = req.files ? Object(req.files).file : [];
    const hasIdentityDoc = Array.isArray(fileKeys) && fileKeys.length > 0;

    const token: string = uid2(26);
    const salt: string = uid2(26);
    const hash: string = SHA256(password + salt).toString(encBase64);

    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const formattedPhoneNumber = phoneNumber
      .replace(/\D/g, "")
      .replace(/^0/, "33");

    if (!/^(33)[6-7]\d{8}$/.test(formattedPhoneNumber)) {
      Retour.error("Invalid phone number format");
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    try {
      await client.messages.create({
        body: `Votre code d'activation est: ${verificationCode}`,
        from: "Localappy",
        to: `+${formattedPhoneNumber}`,
      });
    } catch (smsError) {
      console.error("Twilio error:", smsError);
      Retour.error("Twilio error");
      return res.status(500).json({
        error: "Failed to send SMS verification code",
        details: smsError,
      });
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
      isVerified: false,
      verificationCode,
      customerAccount: customerFinded,
      // cni: sera rempli seulement si doc fourni
    });

    // ✅ Upload Cloudinary seulement si le fichier existe
    if (hasIdentityDoc) {
      const result = await cloudinary.v2.uploader.upload(fileKeys[0].path, {
        folder: `${owner.account.firstname}_${owner.account.name}_folder`,
      });

      owner.cni = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    await owner.save();

    Object(customerFinded).ownerAccount = owner;
    await Object(customerFinded).save();

    // Planifier la suppression après 1 heure (si non vérifié)
    await agenda.start();
    await agenda.schedule("in 1 hour", "delete unverified owner", {
      ownerId: owner._id,
    });

    // ✅ Tu peux décider de notifier seulement si la CNI est fournie
    await notifyAdminsNewOwner({
      ownerId: String(owner._id),
      ownerFirstname: owner.account.firstname,
      ownerName: owner.account.name,
      customerId: String(customerFinded._id),
    });

    Retour.info("Owner created. Verification code sent via SMS.");
    return res.status(201).json({
      message: "Owner created. Verification code sent via SMS.",
      ownerId: owner._id,
      token: owner.token,
      identityProvided: hasIdentityDoc, // ✅ pratique côté front
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
    const { ownerId } = req.params;

    // Supprimer l'owner par son ID
    const deletedOwner = await Owner.findByIdAndDelete(ownerId);
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
