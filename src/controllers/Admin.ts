import { NextFunction, Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

// Models
import Admin from "../models/Admin";

const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name, firstname, phoneNumber, password, passwordConfirmed } =
      req.body;

    // 1. Valider les champs requis
    if (!email || !name || !firstname || !phoneNumber || !password) {
      return res
        .status(400)
        .json({ error: "Tous les champs requis doivent être remplis." });
    }

    // 2. Vérifier si les mots de passe correspondent
    if (password !== passwordConfirmed) {
      return res
        .status(400)
        .json({ error: "Les mots de passe ne correspondent pas." });
    }

    // 3. Vérifier si l'email est valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email invalide." });
    }

    // 4. Vérifier si l'email est déjà utilisé
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(409)
        .json({ error: "Un administrateur avec cet email existe déjà." });
    }

    // 5. Générer le token, le salt et le hash
    const token: string = uid2(26);
    const salt: string = uid2(26);
    const hash: string = SHA256(password + salt).toString(encBase64);

    // 6. Créer un nouvel administrateur
    const admin = new Admin({
      email,
      account: {
        name,
        firstname,
        phoneNumber,
      },
      token,
      salt,
      hash,
    });

    // 7. Sauvegarder dans la base de données
    await admin.save();

    // 8. Répondre avec un message de succès (sans inclure le hash/salt)
    return res.status(201).json({
      message: "Administrateur créé avec succès.",
      admin: {
        id: admin._id,
        email: admin.email,
        account: admin.account,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'administrateur :", error);
    return res.status(500).json({
      error: "Une erreur est survenue, veuillez réessayer plus tard.",
    });
  }
};

const updateAdmin = async (req: Request, res: Response) => {
  const adminId = req.params.adminId;
  return Admin.findById(adminId).then(async (admin) => {
    if (!admin) {
      return res.status(404).json({ message: "Not found" });
    } else {
      admin.set(req.body);
      return admin
        .save()
        .then((admin) => res.status(201).json({ admin: admin }))
        .catch((error) => res.status(500).json({ error: error.message }));
    }
  });
};

const deleteAdmin = async (req: Request, res: Response) => {
  const adminId = req.params.adminId;

  return Admin.findByIdAndDelete(adminId)
    .then((admin) =>
      admin
        ? res.status(200).json({ message: "Admin is deleted" })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

export default { createAdmin, updateAdmin, deleteAdmin };
