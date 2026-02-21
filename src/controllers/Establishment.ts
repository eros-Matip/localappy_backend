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
import {
  notifyAdminsActivationRequest,
  notifyAdminsNewEstablishment,
} from "../services/notifyAdmins";

const cloudinary = require("cloudinary");

const normalizeRna = (input: string): string | null => {
  if (!input) return null;
  const cleaned = String(input)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
  if (/^W\d{9}$/.test(cleaned)) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return `W${cleaned}`;
  return null;
};

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
    rna,
    adress,
    city,
    zip,
    activityCodeNAF,
    legalForm,
    owner: ownerId,
  } = req.body;

  const form = String(legalForm || "company");
  const isAssociation = form === "association";

  // ✅ champs communs obligatoires (on garde)
  if (!activity || !adressLabel || !society || !adress || !city || !zip) {
    Retour.warn("Some value is missing");
    return res.status(400).json({ message: "Some value is missing" });
  }

  // ✅ validation entreprise vs asso (on garde)
  if (!isAssociation) {
    if (!siret || !/^\d{14}$/.test(String(siret).trim())) {
      Retour.warn("SIRET missing/invalid");
      return res.status(400).json({ message: "SIRET manquant ou invalide." });
    }
  } else {
    const rnaNorm = normalizeRna(rna);
    if (!rnaNorm) {
      Retour.warn("RNA missing/invalid");
      return res.status(400).json({
        message:
          "RNA manquant ou invalide. Format attendu: W######### ou #########",
      });
    }
  }

  // ✅ fichier OPTIONNEL maintenant : KBis (entreprise) / document légal (asso)
  const fileArr = req.files ? (Object(req.files) as any).photos : [];
  const hasFile = Array.isArray(fileArr) && fileArr.length > 0;

  try {
    // ✅ owner
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      Retour.warn("Owner not found");
      return res.status(404).json({ message: "Owner not found" });
    }

    // ⚠️ si on veux autoriser la création sans vérif tel, commenter ce bloc
    if (!owner.isVerified) {
      Retour.warn("Owner not verified");
      return res.status(403).json({
        message: "Owner phone not verified",
        action: "VERIFY_PHONE_REQUIRED",
      });
    }

    // ✅ geocode
    const responseApiGouv = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        adressLabel,
      )}`,
    );

    if (!responseApiGouv.data.features?.length) {
      Retour.warn("Invalid address, no coordinates found.");
      return res
        .status(400)
        .json({ message: "Invalid address, no coordinates found." });
    }

    const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
    const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];

    // ✅ unicité
    if (!isAssociation) {
      const existing = await Establishment.findOne({
        "legalInfo.siret": String(siret).trim(),
      });

      if (existing) {
        Retour.warn("Establishment already exists (SIRET)");
        return res.status(409).json({
          message: "An establishment with the same SIRET already exists",
        });
      }
    } else {
      const rnaNorm = normalizeRna(rna)!;
      const existing = await Establishment.findOne({
        legalForm: "association",
        "legalInfo.rna": rnaNorm,
      });

      if (existing) {
        Retour.warn("Establishment already exists (RNA)");
        return res.status(409).json({
          message: "An association with the same RNA already exists",
        });
      }
    }

    // ✅ upload Cloudinary seulement si doc fourni
    let uploadResult: { public_id: string; secure_url: string } | null = null;

    if (hasFile) {
      const cloudinaryFolder = `${owner.account.firstname}_${owner.account.name}_folder`;

      const result = await cloudinary.v2.uploader.upload(fileArr[0].path, {
        folder: cloudinaryFolder,
        public_id: isAssociation ? "AssociationDocument" : "KBis",
        resource_type: "auto", // ✅ important (PDF ou image)
      });

      uploadResult = {
        public_id: result.public_id,
        secure_url: result.secure_url,
      };
    }

    // ✅ création établissement (DOC PAS OBLIGATOIRE)
    const establishment = new Establishment({
      name: society,
      type: Array.isArray(activity) ? activity : [activity],
      legalForm: isAssociation ? "association" : "company",

      address: {
        street: adress,
        city,
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
        // entreprise
        siret: !isAssociation
          ? String(siret).trim()
          : siret
            ? String(siret).trim()
            : undefined,

        KBis:
          !isAssociation && uploadResult
            ? {
                public_id: uploadResult.public_id,
                secure_url: uploadResult.secure_url,
              }
            : undefined,

        // association
        rna: isAssociation ? normalizeRna(rna)! : undefined,

        legalDocument:
          isAssociation && uploadResult
            ? {
                public_id: uploadResult.public_id,
                secure_url: uploadResult.secure_url,
                label: "Statuts / Récépissé",
              }
            : undefined,

        activityCodeNAF: activityCodeNAF || undefined,
      },

      owner: owner._id,
      events: [],
      ads: [],
      staff: [],

      // ✅ Tant que doc pas fourni, on garde désactivé
      activated: false,
    });

    await establishment.save();

    owner.establishments.push((establishment as any)._id);
    await owner.save();

    // ✅ notif admins (tu peux la garder)
    notifyAdminsNewEstablishment({
      establishmentId: String(establishment._id),
      establishmentName: society,
      legalForm: isAssociation ? "association" : "company",
      ownerId: String(owner._id),
      ownerFirstname: owner.account.firstname,
      ownerName: owner.account.name,
    }).catch((e) => console.error("Admin notification failed:", e));

    const needsLegalDoc = !hasFile;

    Retour.info("Establishment created successfully (draft mode)");
    return res.status(201).json({
      message: "Establishment created successfully",
      establishment,
      // ✅ pratique côté front
      activated: establishment.activated,
      needsLegalDoc,
      legalDocType: isAssociation ? "ASSOCIATION_DOC" : "KBIS",
    });
  } catch (error: any) {
    Retour.error(`Error creating establishment: ${error?.message || error}`);
    return res.status(500).json({
      error: "Failed to create establishment",
      details: error?.message || error,
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
      req.params.establishmentId,
    ).populate([
      {
        path: "staff",
        model: "Customer",
      },
      {
        path: "events",
        model: "Event",
        populate: { path: "registrations", select: "quantity" },
      },
    ]);

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
              0,
            )
          : 0;

        statsByCategory.inscriptions += registrationsCount;

        // On enrichit l'event retourné avec un champ dérivé sans changer les clés top-level
        const base = typeof evt.toObject === "function" ? evt.toObject() : evt;
        return { ...base, registrationsCount };
      },
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
      req.params.establishmentId,
    )
      .select(
        "name description address location photos openingHours logo events contact acceptedPayments legalForm descriptionI18n",
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

const getTicketsStatsByEstablishment = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;

    if (!mongoose.isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    const estId = new mongoose.Types.ObjectId(establishmentId);

    const pipeline = [
      { $match: { status: { $in: ["paid", "confirmed"] } } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      { $match: { "event.organizer.establishment": estId } },
      {
        $addFields: {
          extrasTotal: {
            $cond: [{ $isArray: "$extras" }, { $sum: "$extras.price" }, 0],
          },
        },
      },
      {
        $addFields: {
          ticketAmount: {
            $add: [
              { $multiply: ["$price", "$quantity"] },
              { $ifNull: ["$extrasTotal", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$event._id",
          title: { $first: "$event.title" },
          date: { $first: "$event.startingDate" },
          ticketsCount: { $sum: "$quantity" },
          registrationsCount: { $sum: 1 },
          totalAmount: { $sum: "$ticketAmount" },
        },
      },
      {
        $group: {
          _id: null,
          establishment: { $first: estId },
          events: {
            $push: {
              eventId: "$_id",
              title: "$title",
              date: "$date",
              ticketsCount: "$ticketsCount",
              registrationsCount: "$registrationsCount",
              totalAmount: "$totalAmount",
            },
          },
          totalTickets: { $sum: "$ticketsCount" },
          totalRegistrations: { $sum: "$registrationsCount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          establishment: 1,
          totalTickets: 1,
          totalRegistrations: 1,
          totalAmount: 1,
          events: 1,
        },
      },
    ];

    const stats = await (Registration as any).aggregate(pipeline);
    const establishment = await Establishment.findById(establishmentId).lean();

    if (!stats || stats.length === 0) {
      return res.json({
        establishment: establishmentId,
        totalTickets: 0,
        totalRegistrations: 0,
        totalAmount: 0,
        amountAvailable: establishment?.amountAvailable ?? 0,
        events: [],
      });
    }

    return res.json({
      ...stats[0],
      amountAvailable: establishment?.amountAvailable ?? 0,
    });
  } catch (err) {
    Retour.error(`getTicketsStatsByEstablishment error: ${err} `);
    return res.status(500).json({ message: "Server error" });
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
    const updates: any = { ...(req.body || {}) };

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // ✅ Parse auto si FormData (stringifiés)
    ["openingHours", "address", "staff"].forEach((key) => {
      if (typeof updates[key] === "string") {
        try {
          updates[key] = JSON.parse(updates[key]);
        } catch (err) {
          console.warn(`[updateEstablishment] parsing error for ${key}`, err);
        }
      }
    });

    // 🔁 Gestion des fichiers photos
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })
      ?.photos;

    if (files && files.length > 0) {
      const folderName = slugify(establishment.name, {
        lower: true,
        strict: true,
      });

      // 🧹 Supprimer les anciennes images
      if (Array.isArray(establishment.photos) && establishment.photos.length) {
        for (const url of establishment.photos) {
          const publicId = extractPublicId(url);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (e) {
              console.warn("[updateEstablishment] cloudinary destroy error", e);
            }
          }
        }
      }

      // 📤 Upload des nouvelles images
      const uploadedUrls: string[] = [];
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
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            fullAddress,
          )}&limit=1`,
        );

        if (data?.features?.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          establishment.location = { lat, lng };

          const context = data.features[0].properties.context || "";
          const parts = context.split(",").map((s: string) => s.trim());
          const department = parts[1] || "";
          const region = parts[2] || "";

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
        console.warn("[updateEstablishment] api-adresse error:", err);
      }
    }

    // ✅ Staff payload isolé (évite overwrite via boucle générique)
    const staffPayload = updates.staff;
    delete updates.staff;

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

    // ===========================
    // 👥 STAFF SYNC (Establishment.staff <-> Customer.establishmentStaffOf)
    // ===========================
    if (staffPayload !== undefined) {
      const toObjectIds = (input: any): mongoose.Types.ObjectId[] => {
        const arr = Array.isArray(input) ? input : [input];
        return arr
          .map((v) => (typeof v === "string" ? v.trim() : v))
          .filter((v) => mongoose.isValidObjectId(v))
          .map((v) => new mongoose.Types.ObjectId(v));
      };

      const ensureExistingCustomers = async (
        ids: mongoose.Types.ObjectId[],
      ) => {
        if (!ids.length) return [];
        const existing = await Customer.find({ _id: { $in: ids } }).select(
          "_id",
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

      const current: mongoose.Types.ObjectId[] = Array.isArray(
        establishment.staff,
      )
        ? (establishment.staff as any[]).map(
            (id: any) => new mongoose.Types.ObjectId(id),
          )
        : [];

      const currentSet = new Set(current.map(String));

      // --- set complet : payload = [...] OU { set: [...] }
      if (Array.isArray(staffPayload) || Array.isArray(staffPayload?.set)) {
        const targetRaw = Array.isArray(staffPayload)
          ? staffPayload
          : staffPayload.set;

        const targetIds = uniq(
          await ensureExistingCustomers(toObjectIds(targetRaw)),
        );
        const targetSet = new Set(targetIds.map(String));

        const toRemove = current.filter((id) => !targetSet.has(String(id)));
        const toAdd = targetIds.filter((id) => !currentSet.has(String(id)));

        establishment.staff = targetIds as any;

        if (toRemove.length) {
          await Customer.updateMany(
            { _id: { $in: toRemove } },
            { $pull: { establishmentStaffOf: establishment._id } },
          );
        }
        if (toAdd.length) {
          await Customer.updateMany(
            { _id: { $in: toAdd } },
            { $addToSet: { establishmentStaffOf: establishment._id } },
          );
        }
      }

      // --- add/remove incrémental
      else if (staffPayload && typeof staffPayload === "object") {
        // add
        if (Array.isArray(staffPayload.add)) {
          const addIds = uniq(
            await ensureExistingCustomers(toObjectIds(staffPayload.add)),
          );
          establishment.staff = uniq([...current, ...addIds]) as any;

          if (addIds.length) {
            await Customer.updateMany(
              { _id: { $in: addIds } },
              { $addToSet: { establishmentStaffOf: establishment._id } },
            );
          }
        }

        // remove
        if (Array.isArray(staffPayload.remove)) {
          const removeIds = uniq(
            await ensureExistingCustomers(toObjectIds(staffPayload.remove)),
          );
          const removeSet = new Set(removeIds.map(String));

          establishment.staff = current.filter(
            (id) => !removeSet.has(String(id)),
          ) as any;

          if (removeIds.length) {
            await Customer.updateMany(
              { _id: { $in: removeIds } },
              { $pull: { establishmentStaffOf: establishment._id } },
            );
          }
        }
      } else {
        console.warn(
          "[updateEstablishment] 'staff' doit être un tableau ou { add/remove/set }.",
        );
      }
    }

    // ✅ Save
    const saved = await establishment.save();

    // ✅ Retour avec staff peuplé (sinon ton front n’a pas account/picture)
    const populated = await Establishment.findById(saved._id).populate(
      "staff",
      "email account picture",
    );

    return res.status(200).json(populated);
  } catch (error: any) {
    console.error("[updateEstablishment] error:", error);
    return res.status(500).json({ error: "Failed to update establishment" });
  }
};

const requestActivation = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;

    if (!mongoose.isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    // ✅ On essaye d’être compatible avec plusieurs middlewares possibles
    const requesterOwnerId =
      (req as any)?.ownerId ||
      (req as any)?.user?.ownerId ||
      (req as any)?.user?._id ||
      (req as any)?.customer?.ownerAccount?.ownerId ||
      (req as any)?.customer?.ownerAccount?._id ||
      req.body?.ownerId ||
      req.body?.owner;

    if (
      !requesterOwnerId ||
      !mongoose.isValidObjectId(String(requesterOwnerId))
    ) {
      return res.status(401).json({
        message: "Owner introuvable (auth).",
        action: "OWNER_AUTH_REQUIRED",
      });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // ✅ Sécu : seul le owner de l’établissement peut demander l’activation
    if (String((establishment as any).owner) !== String(requesterOwnerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ✅ Si déjà activé : on ne redemande pas
    if ((establishment as any).activated) {
      return res.status(409).json({
        message: "Establishment already activated",
        activated: true,
      });
    }

    // ✅ Vérifs côté backend (même si le front le fait déjà)
    const nameOk = !!String((establishment as any).name || "").trim();
    const phoneOk = !!String(
      (establishment as any).phone ||
        (establishment as any)?.contact?.phone ||
        "",
    ).trim();

    const hasKBis = !!(establishment as any)?.legalInfo?.KBis?.secure_url;
    const hasAssoDoc = !!(establishment as any)?.legalInfo?.legalDocument
      ?.secure_url;
    const docOk = hasKBis || hasAssoDoc;

    const missing: string[] = [];
    if (!nameOk) missing.push("name");
    if (!phoneOk) missing.push("phone");
    if (!docOk) missing.push("legalDoc");

    if (missing.length) {
      return res.status(400).json({
        message: "Activation request rejected: missing required fields",
        missing,
      });
    }

    // ✅ Marquer comme “demande envoyée”
    // ⚠️ IMPORTANT : si ton schema Establishment n’a pas ces champs, ajoute-les,
    // sinon Mongoose (strict) peut les ignorer.
    (establishment as any).activationRequested = true;
    (establishment as any).activationRequestedAt = new Date();
    (establishment as any).activationStatus = "pending"; // pending | approved | rejected
    (establishment as any).activationReviewedAt = null;
    (establishment as any).activationReviewedBy = null;

    await establishment.save();

    // ✅ notif admins (comme createEstablishment)
    const owner = await Owner.findById(requesterOwnerId);

    notifyAdminsActivationRequest({
      establishmentId: String((establishment as any)._id),
      establishmentName: String((establishment as any).name || "—"),
      legalForm: ((establishment as any).legalForm || "company") as
        | "company"
        | "association",
      ownerId: String(requesterOwnerId),
      ownerFirstname: owner?.account?.firstname || "—",
      ownerName: owner?.account?.name || "—",
    }).catch((e) => console.error("Admin notification failed:", e));

    Retour.info("Activation requested successfully");
    return res.status(200).json({
      message: "Activation requested successfully",
      activationRequested: true,
      establishment,
    });
  } catch (error: any) {
    Retour.error(`requestActivation error: ${error?.message || error}`);
    return res.status(500).json({
      message: "Failed to request activation",
      details: error?.message || String(error),
    });
  }
};

const uploadLegalDoc = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;

    if (!mongoose.isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    // owner auth depuis middleware
    const requesterOwnerId = (req as any)?.ownerId || (req as any)?.user?._id;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // seul le owner peut upload
    if (String((establishment as any).owner) !== String(requesterOwnerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const fileArr = req.files ? (Object(req.files) as any).photos : [];
    const hasFile = Array.isArray(fileArr) && fileArr.length > 0;

    if (!hasFile) {
      return res.status(400).json({ message: "No file provided" });
    }

    // legalForm peut venir du body, sinon de l’establishment
    const legalForm = String(
      req.body?.legalForm || (establishment as any).legalForm || "company",
    );
    const isAssociation = legalForm === "association";

    const owner = await Owner.findById(requesterOwnerId);
    const cloudinaryFolder = owner
      ? `${owner.account.firstname}_${owner.account.name}_folder`
      : `owners/${String(requesterOwnerId)}`;

    const result = await cloudinary.v2.uploader.upload(fileArr[0].path, {
      folder: cloudinaryFolder,
      public_id: isAssociation ? "AssociationDocument" : "KBis",
      resource_type: "auto",
    });

    const uploadResult = {
      public_id: result.public_id,
      secure_url: result.secure_url,
    };

    // ✅ stocker AU BON ENDROIT (ce que requestActivation check)
    (establishment as any).legalInfo = (establishment as any).legalInfo || {};

    if (isAssociation) {
      (establishment as any).legalInfo.legalDocument = {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        label: "Statuts / Récépissé",
      };
    } else {
      (establishment as any).legalInfo.KBis = {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
      };
    }

    await establishment.save();

    Retour.info("Legal doc uploaded");
    return res.status(200).json({
      message: "Legal doc uploaded",
      establishment,
    });
  } catch (error: any) {
    Retour.error(`uploadLegalDoc error: ${error?.message || error}`);
    return res.status(500).json({
      message: "Failed to upload legal doc",
      details: error?.message || String(error),
    });
  }
};

const approveActivation = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;

    if (!mongoose.isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    const adminId = (req as any)?.adminId || (req as any)?.user?._id || null;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment)
      return res.status(404).json({ message: "Establishment not found" });

    (establishment as any).activated = true;
    (establishment as any).activationStatus = "approved";
    (establishment as any).activationReviewedAt = new Date();
    (establishment as any).activationReviewedBy = adminId;

    await establishment.save();

    return res.status(200).json({
      message: "Activation approved",
      establishment,
    });
  } catch (error: any) {
    Retour.error(`approveActivation error: ${error?.message || error}`);
    return res.status(500).json({ message: "Failed to approve activation" });
  }
};

const rejectActivation = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;

    if (!mongoose.isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    const adminId = (req as any)?.adminId || (req as any)?.user?._id || null;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment)
      return res.status(404).json({ message: "Establishment not found" });

    (establishment as any).activated = false;
    (establishment as any).activationStatus = "rejected";
    (establishment as any).activationReviewedAt = new Date();
    (establishment as any).activationReviewedBy = adminId;

    await establishment.save();

    return res.status(200).json({
      message: "Activation rejected",
      establishment,
    });
  } catch (error: any) {
    Retour.error(`rejectActivation error: ${error?.message || error}`);
    return res.status(500).json({ message: "Failed to reject activation" });
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
      { $pull: { establishments: id } },
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
  getTicketsStatsByEstablishment,
  // fetchEstablishmentsByJson,
  updateEstablishment,
  requestActivation,
  uploadLegalDoc,
  approveActivation,
  rejectActivation,
  deleteEstablishment,
};
