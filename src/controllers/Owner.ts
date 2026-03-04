import { Request, Response } from "express";
import Owner from "../models/Owner";
import Establishment from "../models/Establishment";
import Customer from "../models/Customer";
import Retour from "../library/Retour";

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

import twilio from "twilio";
import { Job, Agenda } from "agenda";
import config from "../config/config";
import { notifyAdminsNewOwner } from "../services/notifyAdmins";

const cloudinary = require("cloudinary");

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Configurer Agenda avec MongoDB
const agenda = new Agenda({ db: { address: `${config.mongooseUrl}` } });

/* =========================================================
   ✅ A NE PAS TOUCHER : JOB + CREATE (inscription / SMS)
========================================================= */

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
      identityProvided: hasIdentityDoc,
    });
  } catch (error) {
    console.error("Error creating owner:", error);
    Retour.error("Failed to create owner");
    return res
      .status(500)
      .json({ error: "Failed to create owner", details: error });
  }
};

/* =========================================================
   ✅ NOUVEAU : HELPERS ADMIN (sanitisation + filtres)
========================================================= */

const OWNER_SAFE_PROJECTION = {
  hash: 0,
  salt: 0,
  token: 0,
  verificationCode: 0,
  expoPushToken: 0,
  "passwordLosted.code": 0,
} as const;

function toBool(v: any): boolean | undefined {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return undefined;
}

function toInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveOwnerIdsFromEstablishmentFilters(params: {
  activationStatus?: string;
  hasBannedEstablishment?: boolean;
  hasDisabledEstablishment?: boolean;
}) {
  const { activationStatus, hasBannedEstablishment, hasDisabledEstablishment } =
    params;

  const estQuery: any = {};

  if (
    activationStatus &&
    ["pending", "approved", "rejected"].includes(activationStatus)
  ) {
    estQuery.activationStatus = activationStatus;
  }
  if (hasBannedEstablishment === true) estQuery.banned = true;
  if (hasDisabledEstablishment === true) estQuery.activated = false;

  const hasAny = Object.keys(estQuery).length > 0;

  if (!hasAny) return null;

  const ownerIds = await Establishment.distinct("owner", estQuery);
  // distinct peut renvoyer null / undefined dans certains cas
  return (ownerIds || []).filter(Boolean);
}

/* =========================================================
   ✅ NOUVEAU : CONTROLLERS ADMIN POUR DASHBOARD "GÉRANTS"
========================================================= */

/**
 * GET /ownersControl/owners
 * Query:
 *  q, verified, validated, missingCni, missingPicture, multi,
 *  activationStatus, hasBannedEstablishment, hasDisabledEstablishment,
 *  page, limit, sort
 */
const getOwnersForAdmin = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const verified = toBool(req.query.verified);
    const validated = toBool(req.query.validated);
    const missingCni = toBool(req.query.missingCni);
    const missingPicture = toBool(req.query.missingPicture);
    const multi = toBool(req.query.multi);

    const activationStatus = String(req.query.activationStatus || "").trim();
    const hasBannedEstablishment = toBool(req.query.hasBannedEstablishment);
    const hasDisabledEstablishment = toBool(req.query.hasDisabledEstablishment);

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 30)));
    const skip = (page - 1) * limit;

    const sortRaw = String(req.query.sort || "createdAt_desc");
    const sort: any =
      sortRaw === "createdAt_asc"
        ? { createdAt: 1 }
        : sortRaw === "updatedAt_desc"
          ? { updatedAt: -1 }
          : sortRaw === "updatedAt_asc"
            ? { updatedAt: 1 }
            : { createdAt: -1 };

    const match: any = {};

    if (q) {
      const rq = new RegExp(escapeRegex(q), "i");
      const or: any[] = [
        { email: rq },
        { "account.name": rq },
        { "account.firstname": rq },
      ];

      // si q ressemble à un ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(q)) or.push({ _id: q });

      // si q est un numéro, match exact sur phoneNumber
      const digits = q.replace(/\D/g, "");
      if (digits.length >= 6 && Number.isFinite(Number(digits))) {
        or.push({ "account.phoneNumber": Number(digits) });
      }

      match.$or = or;
    }

    if (verified !== undefined) match.isVerified = verified;
    if (validated !== undefined) match.isValidated = validated;

    if (missingCni === true) {
      match.$or = [
        ...(match.$or || []),
        { "cni.url": { $exists: false } },
        { "cni.url": null },
        { "cni.url": "" },
      ];
    }
    if (missingPicture === true) {
      match.$or = [
        ...(match.$or || []),
        { "picture.url": { $exists: false } },
        { "picture.url": null },
        { "picture.url": "" },
      ];
    }

    if (multi === true) {
      match.$expr = { $gte: [{ $size: "$establishments" }, 2] };
    } else if (multi === false) {
      match.$expr = { $lte: [{ $size: "$establishments" }, 1] };
    }

    // Filtres basés sur Establishment
    const filteredOwnerIds = await resolveOwnerIdsFromEstablishmentFilters({
      activationStatus,
      hasBannedEstablishment,
      hasDisabledEstablishment,
    });

    if (filteredOwnerIds && filteredOwnerIds.length === 0) {
      return res.status(200).json({
        owners: [],
        stats: {
          total: 0,
          verified: 0,
          validated: 0,
          missingCni: 0,
          missingPicture: 0,
          multi: 0,
        },
        page,
        limit,
      });
    }

    if (filteredOwnerIds && filteredOwnerIds.length > 0) {
      match._id = { $in: filteredOwnerIds };
    }

    const [owners, total] = await Promise.all([
      Owner.find(match)
        .select(OWNER_SAFE_PROJECTION)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "establishments",
          select:
            "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
        })
        .lean(),
      Owner.countDocuments(match),
    ]);

    // Stats (sur le même match, sans pagination)
    const statsAgg = await Owner.aggregate([
      { $match: match },
      {
        $project: {
          isVerified: 1,
          isValidated: 1,
          hasCni: {
            $cond: [
              {
                $and: [
                  { $ne: ["$cni", null] },
                  { $ne: ["$cni.url", null] },
                  { $ne: ["$cni.url", ""] },
                ],
              },
              1,
              0,
            ],
          },
          hasPicture: {
            $cond: [
              {
                $and: [
                  { $ne: ["$picture", null] },
                  { $ne: ["$picture.url", null] },
                  { $ne: ["$picture.url", ""] },
                ],
              },
              1,
              0,
            ],
          },
          estCount: { $size: "$establishments" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ["$isVerified", 1, 0] } },
          validated: { $sum: { $cond: ["$isValidated", 1, 0] } },
          missingCni: { $sum: { $cond: [{ $eq: ["$hasCni", 0] }, 1, 0] } },
          missingPicture: {
            $sum: { $cond: [{ $eq: ["$hasPicture", 0] }, 1, 0] },
          },
          multi: { $sum: { $cond: [{ $gte: ["$estCount", 2] }, 1, 0] } },
        },
      },
    ]);

    const stats = statsAgg?.[0] || {
      total: 0,
      verified: 0,
      validated: 0,
      missingCni: 0,
      missingPicture: 0,
      multi: 0,
    };

    return res.status(200).json({
      owners,
      stats: {
        total: stats.total || 0,
        verified: stats.verified || 0,
        validated: stats.validated || 0,
        missingCni: stats.missingCni || 0,
        missingPicture: stats.missingPicture || 0,
        multi: stats.multi || 0,
      },
      page,
      limit,
      total,
    });
  } catch (error) {
    console.error("Failed to list owners (admin):", error);
    return res.status(500).json({
      error: "Failed to list owners",
      details: error,
    });
  }
};

/**
 * GET /ownersControl/owners/:id
 */
const getOwnerDetailsForAdmin = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId)
      .select(OWNER_SAFE_PROJECTION)
      .populate({
        path: "establishments",
        select:
          "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
      })
      .lean();

    if (!owner) return res.status(404).json({ message: "Owner not found" });

    return res.status(200).json({ owner });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to retrieve owner",
      details: error,
    });
  }
};

/**
 * PATCH /ownersControl/owners/:id/set-validated  body: { value: boolean }
 */
const setOwnerValidatedForAdmin = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const value = toBool(req.body?.value);

    if (value === undefined) {
      return res.status(400).json({ error: "value (boolean) is required" });
    }

    const owner = await Owner.findByIdAndUpdate(
      ownerId,
      { isValidated: value },
      { new: true },
    )
      .select(OWNER_SAFE_PROJECTION)
      .lean();

    if (!owner) return res.status(404).json({ message: "Owner not found" });

    return res.status(200).json({ message: "Owner updated", owner });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update owner",
      details: error,
    });
  }
};

/**
 * PATCH /ownersControl/owners/:id/set-verified body: { value: boolean }
 */
const setOwnerVerifiedForAdmin = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const value = toBool(req.body?.value);

    if (value === undefined) {
      return res.status(400).json({ error: "value (boolean) is required" });
    }

    const owner = await Owner.findByIdAndUpdate(
      ownerId,
      { isVerified: value },
      { new: true },
    )
      .select(OWNER_SAFE_PROJECTION)
      .lean();

    if (!owner) return res.status(404).json({ message: "Owner not found" });

    return res.status(200).json({ message: "Owner updated", owner });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update owner",
      details: error,
    });
  }
};

/**
 * PATCH /ownersControl/owners/:id/reset-attempts
 */
const resetOwnerAttemptsForAdmin = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findByIdAndUpdate(
      ownerId,
      { attempts: 0 },
      { new: true },
    )
      .select(OWNER_SAFE_PROJECTION)
      .lean();

    if (!owner) return res.status(404).json({ message: "Owner not found" });

    return res.status(200).json({ message: "Attempts reset", owner });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to reset attempts",
      details: error,
    });
  }
};

/**
 * PATCH /ownersControl/owners/:id/reset-password-losted
 */
const resetOwnerPasswordLostedForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findByIdAndUpdate(
      ownerId,
      { "passwordLosted.status": false, "passwordLosted.code": undefined },
      { new: true },
    )
      .select(OWNER_SAFE_PROJECTION)
      .lean();

    if (!owner) return res.status(404).json({ message: "Owner not found" });

    return res.status(200).json({ message: "Password lost reset", owner });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to reset password losted",
      details: error,
    });
  }
};

/**
 * PATCH /ownersControl/owners/:id/link-establishment body: { establishmentId: string }
 * ✅ Met à jour Owner.establishments ET Establishment.owner
 */
const linkOwnerToEstablishmentForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const { ownerId } = req.params;
    const { establishmentId } = req.body || {};

    if (!establishmentId) {
      return res.status(400).json({ error: "establishmentId is required" });
    }

    const [owner, est] = await Promise.all([
      Owner.findById(ownerId),
      Establishment.findById(establishmentId),
    ]);

    if (!owner) return res.status(404).json({ error: "Owner not found" });
    if (!est) return res.status(404).json({ error: "Establishment not found" });

    await Promise.all([
      Owner.updateOne(
        { _id: owner._id },
        { $addToSet: { establishments: est._id } },
      ),
      Establishment.updateOne(
        { _id: est._id },
        { $addToSet: { owner: owner._id } },
      ),
    ]);

    const refreshed = await Owner.findById(ownerId)
      .select(OWNER_SAFE_PROJECTION)
      .populate({
        path: "establishments",
        select:
          "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
      })
      .lean();

    return res.status(200).json({
      message: "Owner linked to establishment",
      owner: refreshed,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to link owner to establishment",
      details: error,
    });
  }
};

/**
 * PATCH /ownersControl/owners/:id/unlink-establishment body: { establishmentId: string }
 * ✅ Met à jour Owner.establishments ET Establishment.owner
 */
const unlinkOwnerFromEstablishmentForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const { ownerId } = req.params;
    const { establishmentId } = req.body || {};

    if (!establishmentId) {
      return res.status(400).json({ error: "establishmentId is required" });
    }

    await Promise.all([
      Owner.updateOne(
        { _id: ownerId },
        { $pull: { establishments: establishmentId } },
      ),
      Establishment.updateOne(
        { _id: establishmentId },
        { $pull: { owner: ownerId } },
      ),
    ]);

    const refreshed = await Owner.findById(ownerId)
      .select(OWNER_SAFE_PROJECTION)
      .populate({
        path: "establishments",
        select:
          "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
      })
      .lean();

    if (!refreshed) return res.status(404).json({ error: "Owner not found" });

    return res.status(200).json({
      message: "Owner unlinked from establishment",
      owner: refreshed,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to unlink owner from establishment",
      details: error,
    });
  }
};

/**
 * DELETE /ownersControl/owners/:id
 * ✅ Suppression "admin safe" : détache establishments + customer + cloudinary
 */
const deleteOwnerForAdmin = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    // 1) Détacher des establishments (les 2 côtés)
    await Promise.all([
      Establishment.updateMany(
        { owner: owner._id },
        { $pull: { owner: owner._id } },
      ),
      Owner.updateOne({ _id: owner._id }, { $set: { establishments: [] } }),
    ]);

    // 2) Détacher le customer
    await Customer.updateMany(
      { ownerAccount: owner._id },
      { $set: { ownerAccount: null } },
    );

    // 3) Nettoyage Cloudinary (CNI + picture si possible)
    if (owner.cni?.public_id) {
      try {
        await cloudinary.uploader.destroy(owner.cni.public_id);
      } catch (e) {
        console.warn("Cloudinary destroy CNI warning:", e);
      }
    }
    if (owner.picture?.public_id) {
      try {
        await cloudinary.uploader.destroy(owner.picture.public_id);
      } catch (e) {
        console.warn("Cloudinary destroy picture warning:", e);
      }
    }

    // 4) Supprimer le contenu du dossier puis le dossier
    const folderName = `${owner.account.firstname}_${owner.account.name}_folder`;
    try {
      const { resources } = await cloudinary.api.resources({
        type: "upload",
        prefix: folderName,
        max_results: 500,
      });

      for (const file of resources) {
        await cloudinary.uploader.destroy(file.public_id);
      }

      await cloudinary.api.delete_folder(folderName);
    } catch (e) {
      // folder inexistant / déjà supprimé -> warning only
      console.warn(`Cloudinary cleanup warning for folder ${folderName}:`, e);
    }

    // 5) Supprimer owner
    await owner.deleteOne();

    return res.status(200).json({ message: "Owner deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to delete owner",
      details: error,
    });
  }
};

/* =========================================================
   (OPTIONNEL) Anciennes fonctions "CRUD" (gardées)
   ⚠️ Recommandé: ne pas exposer updateOwner/deleteOwner au dashboard
========================================================= */

// Lire les informations d'un propriétaire par son ID
const getOwnerById = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId)
      .select(OWNER_SAFE_PROJECTION) // ✅ sécurise
      .populate({
        path: "establishments",
        select:
          "name legalForm activated banned activationStatus address.city address.postalCode createdAt updatedAt",
      });

    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    return res.status(200).json(owner);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to retrieve owner", details: error });
  }
};

// Mettre à jour un propriétaire par son ID (⚠️ générique, à éviter côté admin)
const updateOwner = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const updatedData = req.body;

    const updatedOwner = await Owner.findByIdAndUpdate(ownerId, updatedData, {
      new: true,
    }).select(OWNER_SAFE_PROJECTION);

    if (!updatedOwner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    return res.status(200).json(updatedOwner);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to update owner", details: error });
  }
};

// Supprimer un propriétaire par son ID (⚠️ simple delete, à éviter côté admin)
const deleteOwner = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const deletedOwner = await Owner.findByIdAndDelete(ownerId);
    if (!deletedOwner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    return res.status(200).json({ message: "Owner deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to delete owner", details: error });
  }
};

export default {
  // ✅ inscription / sms (inchangé)
  createOwner,

  // ✅ existants
  getOwnerById,
  updateOwner,
  deleteOwner,

  // ✅ nouveaux endpoints admin dashboard "Gérants"
  getOwnersForAdmin,
  getOwnerDetailsForAdmin,
  setOwnerValidatedForAdmin,
  setOwnerVerifiedForAdmin,
  resetOwnerAttemptsForAdmin,
  resetOwnerPasswordLostedForAdmin,
  linkOwnerToEstablishmentForAdmin,
  unlinkOwnerFromEstablishmentForAdmin,
  deleteOwnerForAdmin,
};
