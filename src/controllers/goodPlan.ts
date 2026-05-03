import { Request, Response } from "express";
import mongoose from "mongoose";
import GoodPlan from "../models/GoodPlan";
import Establishment from "../models/Establishment";
import Owner from "../models/Owner";
import { GoodPlanDayOfWeek } from "../interfaces/GoodPlan";

const isValidObjectId = (id: any) => mongoose.isValidObjectId(id);

const GOOD_PLAN_DAYS: GoodPlanDayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const parseJsonField = (value: any, fallback: any) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  return fallback;
};

const normalizeText = (value: string) => {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
};

const normalizeDaysOfWeek = (value: any): GoodPlanDayOfWeek[] => {
  const parsed = parseJsonField(value, []);

  if (!Array.isArray(parsed)) return [];

  return parsed.filter((item: any): item is GoodPlanDayOfWeek => {
    return GOOD_PLAN_DAYS.includes(item);
  });
};

const normalizeDate = (value: any): Date | null => {
  if (!value) return null;

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
};

const getOwnerIdFromBody = (req: Request): string | null => {
  const owner = req.body.owner;

  if (!owner) return null;

  if (typeof owner === "string") return owner;

  if (owner._id) return String(owner._id);

  return null;
};

const checkOwnerCanManageEstablishment = async (
  req: Request,
  establishmentId: string,
) => {
  if (!isValidObjectId(establishmentId)) {
    return {
      allowed: false,
      status: 400,
      message: "Identifiant d'établissement invalide.",
      establishment: null,
      owner: null,
    };
  }

  const ownerId = getOwnerIdFromBody(req);

  if (!ownerId || !isValidObjectId(ownerId)) {
    return {
      allowed: false,
      status: 401,
      message: "Owner non authentifié.",
      establishment: null,
      owner: null,
    };
  }

  const [owner, establishment] = await Promise.all([
    Owner.findById(ownerId).select("_id establishments isValidated isVerified"),
    Establishment.findById(establishmentId).select(
      "_id name owner goodPlans activated banned deletedAt",
    ),
  ]);

  if (!owner) {
    return {
      allowed: false,
      status: 404,
      message: "Owner introuvable.",
      establishment: null,
      owner: null,
    };
  }

  if (!establishment) {
    return {
      allowed: false,
      status: 404,
      message: "Établissement introuvable.",
      establishment: null,
      owner: null,
    };
  }

  if (establishment.deletedAt) {
    return {
      allowed: false,
      status: 410,
      message: "Établissement supprimé.",
      establishment: null,
      owner: null,
    };
  }

  if (establishment.banned) {
    return {
      allowed: false,
      status: 403,
      message: "Établissement banni.",
      establishment: null,
      owner: null,
    };
  }

  const establishmentOwnerIds = (establishment.owner || []).map((id: any) =>
    String(id),
  );

  const ownerEstablishmentIds = (owner.establishments || []).map((id: any) =>
    String(id),
  );

  const ownerCanManage =
    establishmentOwnerIds.includes(String(owner._id)) ||
    ownerEstablishmentIds.includes(String(establishment._id));

  if (!ownerCanManage) {
    return {
      allowed: false,
      status: 403,
      message: "Vous n'avez pas les droits pour gérer cet établissement.",
      establishment: null,
      owner: null,
    };
  }

  return {
    allowed: true,
    status: 200,
    message: "Autorisé.",
    establishment,
    owner,
  };
};

const buildPublicGoodPlanFilter = () => {
  const now = new Date();

  return {
    status: "published",
    isActive: true,
    deletedAt: null,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };
};

const createGoodPlanForAnEstablishment = async (
  req: Request,
  res: Response,
) => {
  try {
    const { establishmentId } = req.params;

    const access = await checkOwnerCanManageEstablishment(req, establishmentId);

    if (!access.allowed || !access.establishment || !access.owner) {
      return res.status(access.status).json({ message: access.message });
    }

    const {
      title,
      shortDescription,
      description,
      type,
      image,
      startDate,
      endDate,
      availability,
      conditions,
      redemption,
      publishNow,
    } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        message: "Le titre est obligatoire.",
      });
    }

    if (
      !shortDescription ||
      typeof shortDescription !== "string" ||
      shortDescription.trim() === ""
    ) {
      return res.status(400).json({
        message: "La description courte est obligatoire.",
      });
    }

    const parsedStartDate = normalizeDate(startDate);
    const parsedEndDate = normalizeDate(endDate);

    if (!parsedStartDate) {
      return res.status(400).json({
        message: "La date de début est invalide ou manquante.",
      });
    }

    if (!parsedEndDate) {
      return res.status(400).json({
        message: "La date de fin est invalide ou manquante.",
      });
    }

    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        message: "La date de fin ne peut pas être avant la date de début.",
      });
    }

    const normalizedTitle = normalizeText(title);

    const existingGoodPlan = await GoodPlan.findOne({
      establishment: access.establishment._id,
      deletedAt: null,
      type: type || "custom",
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      title: { $regex: new RegExp(`^${normalizedTitle}$`, "i") },
    });

    if (existingGoodPlan) {
      return res.status(409).json({
        message: "Un bon plan similaire existe déjà pour cet établissement.",
        goodPlan: existingGoodPlan,
      });
    }

    const parsedAvailability = parseJsonField(availability, {});
    const parsedRedemption = parseJsonField(redemption, {});

    const shouldPublish = publishNow === true || publishNow === "true";

    const maxUses =
      parsedRedemption.maxUses !== undefined &&
      parsedRedemption.maxUses !== null &&
      parsedRedemption.maxUses !== ""
        ? Number(parsedRedemption.maxUses)
        : null;

    const safeMaxUses =
      typeof maxUses === "number" && Number.isFinite(maxUses) ? maxUses : null;

    const newGoodPlan = new GoodPlan({
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      description: typeof description === "string" ? description.trim() : "",

      type: type || "custom",

      establishment: access.establishment._id,
      createdByOwner: access.owner._id,
      createdByCustomer: null,

      image: typeof image === "string" && image.trim() !== "" ? image : null,

      startDate: parsedStartDate,
      endDate: parsedEndDate,

      availability: {
        daysOfWeek: normalizeDaysOfWeek(parsedAvailability.daysOfWeek),
        startTime:
          typeof parsedAvailability.startTime === "string"
            ? parsedAvailability.startTime
            : null,
        endTime:
          typeof parsedAvailability.endTime === "string"
            ? parsedAvailability.endTime
            : null,
      },

      conditions: typeof conditions === "string" ? conditions.trim() : "",

      redemption: {
        mode: parsedRedemption.mode || "none",
        code:
          typeof parsedRedemption.code === "string"
            ? parsedRedemption.code.trim().toUpperCase()
            : null,
        maxUses: safeMaxUses,
        usesCount: 0,
        oneUsePerUser:
          parsedRedemption.oneUsePerUser === true ||
          parsedRedemption.oneUsePerUser === "true",
      },

      stats: {
        views: 0,
        clicks: 0,
        uses: 0,
      },

      clics: [],

      status: shouldPublish ? "published" : "draft",
      isActive: shouldPublish,
      deletedAt: null,
    });

    await newGoodPlan.save();

    await Establishment.findByIdAndUpdate(access.establishment._id, {
      $addToSet: { goodPlans: newGoodPlan._id },
    });

    return res.status(201).json({
      message: shouldPublish
        ? "Bon plan créé et publié avec succès."
        : "Bon plan créé en brouillon avec succès.",
      goodPlan: newGoodPlan,
    });
  } catch (error) {
    console.error("Error creating good plan:", error);

    return res.status(500).json({
      message: "Erreur lors de la création du bon plan.",
      error: error instanceof Error ? error.message : error,
    });
  }
};

const getGoodPlansByPosition = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius } = req.body;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 200);

    const parsedRadius =
      radius !== undefined && radius !== null && radius !== ""
        ? parseFloat(radius)
        : 50;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "La latitude et la longitude sont requises.",
      });
    }

    const lat = typeof latitude === "number" ? latitude : parseFloat(latitude);
    const lon =
      typeof longitude === "number" ? longitude : parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        message: "Les coordonnées fournies ne sont pas valides.",
      });
    }

    const finalRadiusKm = Number.isFinite(parsedRadius) ? parsedRadius : 50;

    const toRad = (value: number) => (value * Math.PI) / 180;

    const haversineDistance = (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ): number => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    const goodPlans = await GoodPlan.find(buildPublicGoodPlanFilter())
      .populate({
        path: "establishment",
        select:
          "_id name logo photos address location openingHours activated banned deletedAt",
        match: {
          activated: true,
          banned: false,
          deletedAt: null,
        },
      })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const filtered = goodPlans
      .filter((goodPlan: any) => {
        const establishment = goodPlan.establishment;

        if (!establishment) return false;

        const estLat = establishment.location?.lat;
        const estLng = establishment.location?.lng;

        if (typeof estLat !== "number" || typeof estLng !== "number") {
          return false;
        }

        const distance = haversineDistance(lat, lon, estLat, estLng);

        goodPlan.distance = distance;
        goodPlan.distanceKm = Number(distance.toFixed(2));

        return distance <= finalRadiusKm;
      })
      .sort((a: any, b: any) => a.distance - b.distance);

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      metadata: {
        radiusKm: finalRadiusKm,
        total,
        currentPage: page,
        pageSize: limit,
      },
      goodPlans: paginated,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des bons plans :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur.",
    });
  }
};

const getPublicGoodPlans = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 200);
    const type = req.query.type as string | undefined;

    const filter: any = buildPublicGoodPlanFilter();

    if (type && type !== "all") {
      filter.type = type;
    }

    const [goodPlans, total] = await Promise.all([
      GoodPlan.find(filter)
        .select(
          "_id title shortDescription description type image startDate endDate availability conditions redemption.mode stats.views stats.uses establishment createdAt",
        )
        .populate({
          path: "establishment",
          select: "name logo photos address location openingHours",
          match: {
            activated: true,
            banned: false,
            deletedAt: null,
          },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      GoodPlan.countDocuments(filter),
    ]);

    const filteredGoodPlans = goodPlans.filter(
      (goodPlan: any) => goodPlan.establishment,
    );

    return res.status(200).json({
      metadata: {
        total,
        currentPage: page,
        pageSize: limit,
      },
      goodPlans: filteredGoodPlans,
    });
  } catch (error) {
    console.error("Erreur récupération bons plans publics:", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des bons plans.",
    });
  }
};

const getGoodPlansForAnEstablishmentPublic = async (
  req: Request,
  res: Response,
) => {
  try {
    const { establishmentId } = req.params;

    if (!isValidObjectId(establishmentId)) {
      return res.status(400).json({
        message: "Identifiant d'établissement invalide.",
      });
    }

    const establishment = await Establishment.findOne({
      _id: establishmentId,
      activated: true,
      banned: false,
      deletedAt: null,
    }).select("_id name");

    if (!establishment) {
      return res.status(404).json({
        message: "Établissement introuvable.",
      });
    }

    const goodPlans = await GoodPlan.find({
      establishment: establishmentId,
      ...buildPublicGoodPlanFilter(),
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: goodPlans.length,
      goodPlans,
    });
  } catch (error) {
    console.error("Erreur récupération bons plans établissement:", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des bons plans.",
    });
  }
};

const getGoodPlansForAnEstablishmentOwner = async (
  req: Request,
  res: Response,
) => {
  try {
    const { establishmentId } = req.params;

    const access = await checkOwnerCanManageEstablishment(req, establishmentId);

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.message });
    }

    const goodPlans = await GoodPlan.find({
      establishment: establishmentId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: goodPlans.length,
      goodPlans,
    });
  } catch (error) {
    console.error("Erreur récupération bons plans owner:", error);

    return res.status(500).json({
      message:
        "Erreur lors de la récupération des bons plans de l'établissement.",
    });
  }
};

const readGoodPlan = async (req: Request, res: Response) => {
  try {
    const { goodPlanId } = req.params;
    let { source } = req.body;

    if (!isValidObjectId(goodPlanId)) {
      return res.status(400).json({
        message: "Identifiant de bon plan invalide.",
      });
    }

    if (source === "deeplink") {
      source = "scannés";
    }

    const goodPlan = await GoodPlan.findOneAndUpdate(
      {
        _id: goodPlanId,
        deletedAt: null,
      },
      {
        $inc: { "stats.views": 1 },
        $push: {
          clics: {
            source: source || "app",
            date: new Date(),
          },
        },
      },
      { new: true },
    ).populate({
      path: "establishment",
      select:
        "_id name logo photos address location contact openingHours activated banned deletedAt",
    });

    if (!goodPlan) {
      return res.status(404).json({
        message: "Bon plan introuvable.",
      });
    }

    return res.status(200).json({
      message: goodPlan,
    });
  } catch (error) {
    console.error("Erreur lecture bon plan:", error);

    return res.status(500).json({
      message: "Erreur lors de la lecture du bon plan.",
      error,
    });
  }
};

const updateGoodPlan = async (req: Request, res: Response) => {
  try {
    const { goodPlanId } = req.params;

    if (!isValidObjectId(goodPlanId)) {
      return res.status(400).json({
        message: "Identifiant de bon plan invalide.",
      });
    }

    const goodPlan = await GoodPlan.findOne({
      _id: goodPlanId,
      deletedAt: null,
    });

    if (!goodPlan) {
      return res.status(404).json({
        message: "Bon plan introuvable.",
      });
    }

    const access = await checkOwnerCanManageEstablishment(
      req,
      String(goodPlan.establishment),
    );

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.message });
    }

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || req.body.title.trim() === "") {
        return res.status(400).json({
          message: "Titre invalide.",
        });
      }

      goodPlan.title = req.body.title.trim();
    }

    if (req.body.shortDescription !== undefined) {
      if (
        typeof req.body.shortDescription !== "string" ||
        req.body.shortDescription.trim() === ""
      ) {
        return res.status(400).json({
          message: "Description courte invalide.",
        });
      }

      goodPlan.shortDescription = req.body.shortDescription.trim();
    }

    if (req.body.description !== undefined) {
      goodPlan.description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : goodPlan.description;
    }

    if (req.body.type !== undefined) {
      goodPlan.type = req.body.type;
    }

    if (req.body.image !== undefined) {
      goodPlan.image =
        typeof req.body.image === "string" && req.body.image.trim() !== ""
          ? req.body.image
          : null;
    }

    if (req.body.startDate !== undefined) {
      const parsedStartDate = normalizeDate(req.body.startDate);

      if (!parsedStartDate) {
        return res.status(400).json({
          message: "La date de début est invalide.",
        });
      }

      goodPlan.startDate = parsedStartDate;
    }

    if (req.body.endDate !== undefined) {
      const parsedEndDate = normalizeDate(req.body.endDate);

      if (!parsedEndDate) {
        return res.status(400).json({
          message: "La date de fin est invalide.",
        });
      }

      goodPlan.endDate = parsedEndDate;
    }

    if (goodPlan.endDate < goodPlan.startDate) {
      return res.status(400).json({
        message: "La date de fin ne peut pas être avant la date de début.",
      });
    }

    if (req.body.availability !== undefined) {
      const parsedAvailability = parseJsonField(req.body.availability, {});

      goodPlan.availability = {
        daysOfWeek: normalizeDaysOfWeek(parsedAvailability.daysOfWeek),
        startTime:
          typeof parsedAvailability.startTime === "string"
            ? parsedAvailability.startTime
            : null,
        endTime:
          typeof parsedAvailability.endTime === "string"
            ? parsedAvailability.endTime
            : null,
      };
    }

    if (req.body.conditions !== undefined) {
      goodPlan.conditions =
        typeof req.body.conditions === "string"
          ? req.body.conditions.trim()
          : "";
    }

    if (req.body.redemption !== undefined) {
      const parsedRedemption = parseJsonField(req.body.redemption, {});

      const maxUses =
        parsedRedemption.maxUses !== undefined &&
        parsedRedemption.maxUses !== null &&
        parsedRedemption.maxUses !== ""
          ? Number(parsedRedemption.maxUses)
          : null;

      const safeMaxUses =
        typeof maxUses === "number" && Number.isFinite(maxUses)
          ? maxUses
          : null;

      goodPlan.redemption = {
        mode: parsedRedemption.mode || goodPlan.redemption.mode || "none",
        code:
          typeof parsedRedemption.code === "string"
            ? parsedRedemption.code.trim().toUpperCase()
            : null,
        maxUses: safeMaxUses,
        usesCount: goodPlan.redemption.usesCount || 0,
        oneUsePerUser:
          parsedRedemption.oneUsePerUser === true ||
          parsedRedemption.oneUsePerUser === "true",
      };
    }

    const updatedGoodPlan = await goodPlan.save();

    return res.status(200).json({
      message: "Bon plan mis à jour avec succès.",
      goodPlan: updatedGoodPlan,
    });
  } catch (error) {
    console.error("Erreur updateGoodPlan:", error);

    return res.status(500).json({
      message: "Erreur lors de la mise à jour du bon plan.",
      error,
    });
  }
};

const publishGoodPlan = async (req: Request, res: Response) => {
  try {
    const { goodPlanId } = req.params;

    if (!isValidObjectId(goodPlanId)) {
      return res.status(400).json({
        message: "Identifiant de bon plan invalide.",
      });
    }

    const goodPlan = await GoodPlan.findOne({
      _id: goodPlanId,
      deletedAt: null,
    });

    if (!goodPlan) {
      return res.status(404).json({
        message: "Bon plan introuvable.",
      });
    }

    const access = await checkOwnerCanManageEstablishment(
      req,
      String(goodPlan.establishment),
    );

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.message });
    }

    if (goodPlan.endDate < new Date()) {
      return res.status(400).json({
        message: "Impossible de publier un bon plan déjà expiré.",
      });
    }

    goodPlan.status = "published";
    goodPlan.isActive = true;

    await goodPlan.save();

    return res.status(200).json({
      message: "Bon plan publié avec succès.",
      goodPlan,
    });
  } catch (error) {
    console.error("Erreur publishGoodPlan:", error);

    return res.status(500).json({
      message: "Erreur lors de la publication du bon plan.",
      error,
    });
  }
};

const disableGoodPlan = async (req: Request, res: Response) => {
  try {
    const { goodPlanId } = req.params;

    if (!isValidObjectId(goodPlanId)) {
      return res.status(400).json({
        message: "Identifiant de bon plan invalide.",
      });
    }

    const goodPlan = await GoodPlan.findOne({
      _id: goodPlanId,
      deletedAt: null,
    });

    if (!goodPlan) {
      return res.status(404).json({
        message: "Bon plan introuvable.",
      });
    }

    const access = await checkOwnerCanManageEstablishment(
      req,
      String(goodPlan.establishment),
    );

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.message });
    }

    goodPlan.status = "disabled";
    goodPlan.isActive = false;

    await goodPlan.save();

    return res.status(200).json({
      message: "Bon plan désactivé avec succès.",
      goodPlan,
    });
  } catch (error) {
    console.error("Erreur disableGoodPlan:", error);

    return res.status(500).json({
      message: "Erreur lors de la désactivation du bon plan.",
      error,
    });
  }
};

const deleteGoodPlan = async (req: Request, res: Response) => {
  try {
    const { goodPlanId } = req.params;

    if (!isValidObjectId(goodPlanId)) {
      return res.status(400).json({
        message: "Identifiant de bon plan invalide.",
      });
    }

    const goodPlan = await GoodPlan.findOne({
      _id: goodPlanId,
      deletedAt: null,
    });

    if (!goodPlan) {
      return res.status(404).json({
        message: "Bon plan introuvable.",
      });
    }

    const access = await checkOwnerCanManageEstablishment(
      req,
      String(goodPlan.establishment),
    );

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.message });
    }

    goodPlan.deletedAt = new Date();
    goodPlan.status = "disabled";
    goodPlan.isActive = false;

    await goodPlan.save();

    return res.status(200).json({
      message: "Bon plan supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur deleteGoodPlan:", error);

    return res.status(500).json({
      message: "Erreur lors de la suppression du bon plan.",
      error,
    });
  }
};

const declareGoodPlanUse = async (req: Request, res: Response) => {
  try {
    const { goodPlanId } = req.params;

    if (!isValidObjectId(goodPlanId)) {
      return res.status(400).json({
        message: "Identifiant de bon plan invalide.",
      });
    }

    const goodPlan = await GoodPlan.findOne({
      _id: goodPlanId,
      ...buildPublicGoodPlanFilter(),
    });

    if (!goodPlan) {
      return res.status(404).json({
        message: "Bon plan indisponible ou expiré.",
      });
    }

    const maxUses = goodPlan.redemption?.maxUses;
    const usesCount = goodPlan.redemption?.usesCount || 0;

    if (typeof maxUses === "number" && usesCount >= maxUses) {
      return res.status(409).json({
        message: "Ce bon plan a atteint sa limite d'utilisation.",
      });
    }

    goodPlan.redemption.usesCount += 1;
    goodPlan.stats.uses += 1;

    await goodPlan.save();

    return res.status(200).json({
      message: "Utilisation du bon plan enregistrée.",
      goodPlan,
    });
  } catch (error) {
    console.error("Erreur declareGoodPlanUse:", error);

    return res.status(500).json({
      message: "Erreur lors de l'utilisation du bon plan.",
      error,
    });
  }
};

export default {
  createGoodPlanForAnEstablishment,
  getGoodPlansByPosition,
  getPublicGoodPlans,
  getGoodPlansForAnEstablishmentPublic,
  getGoodPlansForAnEstablishmentOwner,
  readGoodPlan,
  updateGoodPlan,
  publishGoodPlan,
  disableGoodPlan,
  deleteGoodPlan,
  declareGoodPlanUse,
};
