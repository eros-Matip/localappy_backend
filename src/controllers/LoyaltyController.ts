import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Establishment from "../models/Establishment";
import UserLoyaltyCard from "../models/UserLoyaltyCard";
import Retour from "../library/Retour";

type LoyaltyProgramSubdoc = {
  _id: Types.ObjectId;
  title: string;
  stampGoal: number;
  rewardDescription: string;
  isActive: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdBy?: Types.ObjectId | null;
};

const isValidObjectId = (value: any) => mongoose.isValidObjectId(value);

const normalizeObjectId = (value: any): Types.ObjectId | null => {
  if (!isValidObjectId(value)) return null;
  return new Types.ObjectId(value);
};

const isProgramCurrentlyAvailable = (program: LoyaltyProgramSubdoc) => {
  const now = new Date();

  if (!program.isActive) return false;
  if (program.startsAt && new Date(program.startsAt) > now) return false;
  if (program.endsAt && new Date(program.endsAt) < now) return false;

  return true;
};

const findLoyaltyProgramInEstablishment = (
  establishment: any,
  programId?: string,
): LoyaltyProgramSubdoc | null => {
  const programs = Array.isArray(establishment?.loyaltyPrograms)
    ? establishment.loyaltyPrograms
    : [];

  if (!programs.length) return null;

  if (programId) {
    const found = programs.find(
      (p: any) => String(p._id) === String(programId),
    );
    return found || null;
  }

  const activeProgram = programs.find((p: any) =>
    isProgramCurrentlyAvailable(p),
  );
  return activeProgram || null;
};

const ownerBelongsToEstablishment = (
  establishment: any,
  requesterOwnerId: string | Types.ObjectId | null | undefined,
) => {
  if (!requesterOwnerId) return false;

  const owners = Array.isArray(establishment?.owner) ? establishment.owner : [];
  return owners.some((id: any) => String(id) === String(requesterOwnerId));
};

const staffBelongsToEstablishment = (
  establishment: any,
  requesterCustomerId: string | Types.ObjectId | null | undefined,
) => {
  if (!requesterCustomerId) return false;

  const staff = Array.isArray(establishment?.staff) ? establishment.staff : [];
  return staff.some((id: any) => String(id) === String(requesterCustomerId));
};

const canManageLoyaltyForEstablishment = (
  establishment: any,
  requesterOwnerId?: string | Types.ObjectId | null,
  requesterCustomerId?: string | Types.ObjectId | null,
) => {
  return (
    ownerBelongsToEstablishment(establishment, requesterOwnerId) ||
    staffBelongsToEstablishment(establishment, requesterCustomerId)
  );
};

/**
 * GET /loyalty/my-cards
 * Retourne toutes les cartes fidélité du client connecté
 */
const getMyLoyaltyCards = async (req: Request, res: Response) => {
  try {
    const customerId =
      (req as any)?.customer?._id ||
      (req as any)?.user?._id ||
      req.body?.customerId;

    if (!customerId || !isValidObjectId(customerId)) {
      return res.status(401).json({ message: "Customer auth required" });
    }

    const cards = await UserLoyaltyCard.find({
      userId: customerId,
    })
      .populate("establishmentId", "name logo photos address loyaltyPrograms")
      .sort({ updatedAt: -1 });

    return res.status(200).json(cards);
  } catch (error: any) {
    Retour.error(`getMyLoyaltyCards error: ${error?.message || error}`);
    return res.status(500).json({ message: "Failed to get loyalty cards" });
  }
};

/**
 * GET /loyalty/establishments/:establishmentId/my-card?programId=...
 * Retourne la carte fidélité du client connecté pour un établissement
 * Si elle n'existe pas encore, on peut la créer automatiquement
 */
const getMyLoyaltyCardByEstablishment = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;
    const { programId, autoCreate = "true" } = req.query;

    const customerId =
      (req as any)?.customer?._id ||
      (req as any)?.user?._id ||
      req.body?.customerId;

    if (!customerId || !isValidObjectId(customerId)) {
      return res.status(401).json({ message: "Customer auth required" });
    }

    if (!isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    const establishment = await Establishment.findById(establishmentId).lean();
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    const program = findLoyaltyProgramInEstablishment(
      establishment,
      typeof programId === "string" ? programId : undefined,
    );

    if (!program) {
      return res.status(404).json({ message: "No loyalty program found" });
    }

    if (!isProgramCurrentlyAvailable(program)) {
      return res.status(400).json({ message: "Loyalty program is not active" });
    }

    let card = await UserLoyaltyCard.findOne({
      userId: customerId,
      establishmentId,
      loyaltyProgramId: program._id,
    });

    if (!card && autoCreate === "true") {
      card = await UserLoyaltyCard.create({
        userId: customerId,
        establishmentId,
        loyaltyProgramId: program._id,
        currentStamps: 0,
        status: "active",
        completedCardsCount: 0,
        lastScannedAt: null,
        lastRewardRedeemedAt: null,
      });
    }

    return res.status(200).json({
      establishment: {
        _id: establishment._id,
        name: (establishment as any).name,
        logo: (establishment as any).logo,
        photos: (establishment as any).photos,
        address: (establishment as any).address,
      },
      program,
      card,
    });
  } catch (error: any) {
    Retour.error(
      `getMyLoyaltyCardByEstablishment error: ${error?.message || error}`,
    );
    return res.status(500).json({ message: "Failed to get loyalty card" });
  }
};

/**
 * POST /loyalty/programs
 * body: { establishmentId, title?, stampGoal?, rewardDescription, startsAt?, endsAt? }
 *
 * Crée un programme dans Establishment.loyaltyPrograms
 * Toute la logique fidélité reste dans LoyaltyController, sans rien mettre dans EstablishmentController
 */
const createLoyaltyProgram = async (req: Request, res: Response) => {
  try {
    const {
      establishmentId,
      title,
      stampGoal = 10,
      rewardDescription,
      startsAt = null,
      endsAt = null,
    } = req.body;

    const requesterOwnerId =
      (req as any)?.owner?._id ||
      (req as any)?.ownerId ||
      (req as any)?.user?._id ||
      req.body?.ownerId;

    if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
      return res.status(401).json({ message: "Owner auth required" });
    }

    if (!isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    if (!rewardDescription || !String(rewardDescription).trim()) {
      return res.status(400).json({ message: "rewardDescription is required" });
    }

    const goal = Number(stampGoal);
    if (!Number.isFinite(goal) || goal < 1) {
      return res.status(400).json({ message: "stampGoal must be >= 1" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!Array.isArray((establishment as any).loyaltyPrograms)) {
      (establishment as any).loyaltyPrograms = [];
    }

    const existingPrograms = Array.isArray(
      (establishment as any).loyaltyPrograms,
    )
      ? (establishment as any).loyaltyPrograms
      : [];

    // ✅ bloque si un programme actif existe déjà
    const existingActiveProgram = existingPrograms.find(
      (p: any) => p?.isActive,
    );

    if (existingActiveProgram) {
      return res.status(409).json({
        message:
          "An active loyalty program already exists for this establishment",
        existingProgram: existingActiveProgram,
      });
    }

    // ✅ optionnel : bloque un doublon exact même inactif
    const normalizedTitle = String(title || "Carte de fidélité")
      .trim()
      .toLowerCase();

    const normalizedReward = String(rewardDescription).trim().toLowerCase();

    const duplicateProgram = existingPrograms.find((p: any) => {
      return (
        String(p?.title || "")
          .trim()
          .toLowerCase() === normalizedTitle &&
        Number(p?.stampGoal || 0) === goal &&
        String(p?.rewardDescription || "")
          .trim()
          .toLowerCase() === normalizedReward
      );
    });

    if (duplicateProgram) {
      return res.status(409).json({
        message:
          "A similar loyalty program already exists for this establishment",
        existingProgram: duplicateProgram,
      });
    }

    const nextProgram = {
      _id: new Types.ObjectId(),
      title: title?.trim() || "Carte de fidélité",
      stampGoal: goal,
      rewardDescription: String(rewardDescription).trim(),
      isActive: true,
      startsAt,
      endsAt,
      createdBy: new Types.ObjectId(requesterOwnerId),
    };

    (establishment as any).loyaltyPrograms.push(nextProgram);

    await establishment.save();

    return res.status(201).json({
      message: "Loyalty program created",
      program: nextProgram,
      loyaltyPrograms: (establishment as any).loyaltyPrograms,
    });
  } catch (error: any) {
    Retour.error(`createLoyaltyProgram error: ${error?.message || error}`);
    return res
      .status(500)
      .json({ message: "Failed to create loyalty program" });
  }
};

/**
 * PATCH /loyalty/programs/:programId
 * body: { establishmentId, title?, stampGoal?, rewardDescription?, isActive?, startsAt?, endsAt? }
 */
const updateLoyaltyProgram = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const {
      establishmentId,
      title,
      stampGoal,
      rewardDescription,
      isActive,
      startsAt,
      endsAt,
    } = req.body;

    const requesterOwnerId =
      (req as any)?.owner?._id ||
      (req as any)?.ownerId ||
      (req as any)?.user?._id ||
      req.body?.ownerId;

    if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
      return res.status(401).json({ message: "Owner auth required" });
    }

    if (!isValidObjectId(establishmentId) || !isValidObjectId(programId)) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const programs = Array.isArray((establishment as any).loyaltyPrograms)
      ? (establishment as any).loyaltyPrograms
      : [];

    const program = programs.find(
      (p: any) => String(p._id) === String(programId),
    );

    if (!program) {
      return res.status(404).json({ message: "Loyalty program not found" });
    }

    if (title !== undefined) {
      program.title = String(title).trim();
    }

    if (rewardDescription !== undefined) {
      program.rewardDescription = String(rewardDescription).trim();
    }

    if (stampGoal !== undefined) {
      const goal = Number(stampGoal);
      if (!Number.isFinite(goal) || goal < 1) {
        return res.status(400).json({ message: "stampGoal must be >= 1" });
      }
      program.stampGoal = goal;
    }

    if (isActive !== undefined) {
      program.isActive = Boolean(isActive);
    }

    if (startsAt !== undefined) {
      program.startsAt = startsAt;
    }

    if (endsAt !== undefined) {
      program.endsAt = endsAt;
    }

    await establishment.save();

    return res.status(200).json({
      message: "Loyalty program updated",
      program,
    });
  } catch (error: any) {
    Retour.error(`updateLoyaltyProgram error: ${error?.message || error}`);
    return res
      .status(500)
      .json({ message: "Failed to update loyalty program" });
  }
};

/**
 * DELETE /loyalty/programs/:programId
 * body: { establishmentId }
 */
const deleteLoyaltyProgram = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const { establishmentId } = req.body;

    const requesterOwnerId =
      (req as any)?.owner?._id ||
      (req as any)?.ownerId ||
      (req as any)?.user?._id ||
      req.body?.ownerId;

    if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
      return res.status(401).json({ message: "Owner auth required" });
    }

    if (!isValidObjectId(establishmentId) || !isValidObjectId(programId)) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const currentPrograms = Array.isArray(
      (establishment as any).loyaltyPrograms,
    )
      ? (establishment as any).loyaltyPrograms
      : [];

    const exists = currentPrograms.some(
      (p: any) => String(p._id) === String(programId),
    );

    if (!exists) {
      return res.status(404).json({ message: "Loyalty program not found" });
    }

    (establishment as any).loyaltyPrograms = currentPrograms.filter(
      (p: any) => String(p._id) !== String(programId),
    );

    await establishment.save();

    return res.status(200).json({
      message: "Loyalty program deleted",
      loyaltyPrograms: (establishment as any).loyaltyPrograms,
    });
  } catch (error: any) {
    Retour.error(`deleteLoyaltyProgram error: ${error?.message || error}`);
    return res
      .status(500)
      .json({ message: "Failed to delete loyalty program" });
  }
};

/**
 * GET /loyalty/programs/:establishmentId
 */
const getEstablishmentLoyaltyPrograms = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;

    if (!isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    const establishment = await Establishment.findById(establishmentId)
      .select("name logo loyaltyPrograms")
      .lean();

    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    return res.status(200).json({
      establishmentId: (establishment as any)._id,
      name: (establishment as any).name,
      logo: (establishment as any).logo,
      loyaltyPrograms: Array.isArray((establishment as any).loyaltyPrograms)
        ? (establishment as any).loyaltyPrograms
        : [],
    });
  } catch (error: any) {
    Retour.error(
      `getEstablishmentLoyaltyPrograms error: ${error?.message || error}`,
    );
    return res.status(500).json({ message: "Failed to get loyalty programs" });
  }
};

/**
 * POST /loyalty/scan
 * body: { establishmentId, customerId, programId? }
 *
 * Le commerçant scanne la carte du client.
 * Si la carte n'existe pas, elle est créée.
 */
const scanLoyaltyCard = async (req: Request, res: Response) => {
  try {
    const { establishmentId, customerId, programId } = req.body;

    const requesterOwnerId =
      (req as any)?.owner?._id || (req as any)?.ownerId || null;

    const requesterCustomerId =
      (req as any)?.customer?._id ||
      (req as any)?.user?._id ||
      req.body?.staffId ||
      null;

    if (!isValidObjectId(establishmentId) || !isValidObjectId(customerId)) {
      return res
        .status(400)
        .json({ message: "Invalid establishment/customer id" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (
      !canManageLoyaltyForEstablishment(
        establishment,
        requesterOwnerId,
        requesterCustomerId,
      )
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const program = findLoyaltyProgramInEstablishment(
      establishment,
      typeof programId === "string" ? programId : undefined,
    );

    if (!program) {
      return res.status(404).json({ message: "No loyalty program found" });
    }

    if (!isProgramCurrentlyAvailable(program)) {
      return res.status(400).json({ message: "Loyalty program is not active" });
    }

    let card = await UserLoyaltyCard.findOne({
      userId: customerId,
      establishmentId,
      loyaltyProgramId: program._id,
    });

    if (!card) {
      card = await UserLoyaltyCard.create({
        userId: customerId,
        establishmentId,
        loyaltyProgramId: program._id,
        currentStamps: 0,
        status: "active",
        completedCardsCount: 0,
        lastScannedAt: null,
        lastRewardRedeemedAt: null,
      });
    }

    if (card.status === "reward_available") {
      return res.status(409).json({
        message:
          "Reward already available. Redeem it before adding a new stamp.",
        card,
        program,
      });
    }

    const goal = Number(program.stampGoal || 10);
    const nextStamps = Number(card.currentStamps || 0) + 1;

    card.currentStamps = nextStamps;
    card.lastScannedAt = new Date();

    if (nextStamps >= goal) {
      card.currentStamps = goal;
      card.status = "reward_available";
    } else {
      card.status = "active";
    }

    await card.save();

    return res.status(200).json({
      message:
        card.status === "reward_available"
          ? "Card completed, reward available"
          : "Stamp added",
      card,
      program,
      rewardAvailable: card.status === "reward_available",
      remainingStamps:
        card.status === "reward_available"
          ? 0
          : Math.max(goal - Number(card.currentStamps || 0), 0),
    });
  } catch (error: any) {
    Retour.error(`scanLoyaltyCard error: ${error?.message || error}`);
    return res.status(500).json({ message: "Failed to scan loyalty card" });
  }
};

/**
 * POST /loyalty/redeem
 * body: { establishmentId, customerId, programId? }
 *
 * Le commerçant valide que le client récupère son dû.
 * La carte repart ensuite à 0.
 */
const redeemLoyaltyReward = async (req: Request, res: Response) => {
  try {
    const { establishmentId, customerId, programId } = req.body;

    const requesterOwnerId =
      (req as any)?.owner?._id || (req as any)?.ownerId || null;

    const requesterCustomerId =
      (req as any)?.customer?._id ||
      (req as any)?.user?._id ||
      req.body?.staffId ||
      null;

    if (!isValidObjectId(establishmentId) || !isValidObjectId(customerId)) {
      return res
        .status(400)
        .json({ message: "Invalid establishment/customer id" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (
      !canManageLoyaltyForEstablishment(
        establishment,
        requesterOwnerId,
        requesterCustomerId,
      )
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const program = findLoyaltyProgramInEstablishment(
      establishment,
      typeof programId === "string" ? programId : undefined,
    );

    if (!program) {
      return res.status(404).json({ message: "No loyalty program found" });
    }

    const card = await UserLoyaltyCard.findOne({
      userId: customerId,
      establishmentId,
      loyaltyProgramId: program._id,
    });

    if (!card) {
      return res.status(404).json({ message: "Loyalty card not found" });
    }

    if (card.status !== "reward_available") {
      return res.status(409).json({
        message: "No reward available for this card",
        card,
      });
    }

    card.currentStamps = 0;
    card.status = "active";
    card.completedCardsCount = Number(card.completedCardsCount || 0) + 1;
    card.lastRewardRedeemedAt = new Date();

    await card.save();

    return res.status(200).json({
      message: "Reward redeemed, new cycle started",
      card,
      program,
    });
  } catch (error: any) {
    Retour.error(`redeemLoyaltyReward error: ${error?.message || error}`);
    return res.status(500).json({ message: "Failed to redeem loyalty reward" });
  }
};

/**
 * GET /loyalty/establishments/:establishmentId/stats?programId=...
 *
 * Stats simples pour le MVP
 */
const getLoyaltyStatsByEstablishment = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;
    const { programId } = req.query;

    const requesterOwnerId =
      (req as any)?.owner?._id ||
      (req as any)?.ownerId ||
      (req as any)?.user?._id ||
      null;

    if (!requesterOwnerId || !isValidObjectId(requesterOwnerId)) {
      return res.status(401).json({ message: "Owner auth required" });
    }

    if (!isValidObjectId(establishmentId)) {
      return res.status(400).json({ message: "Invalid establishment id" });
    }

    const establishment = await Establishment.findById(establishmentId).lean();
    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (!ownerBelongsToEstablishment(establishment, requesterOwnerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const program = findLoyaltyProgramInEstablishment(
      establishment,
      typeof programId === "string" ? programId : undefined,
    );

    if (!program) {
      return res.status(404).json({ message: "No loyalty program found" });
    }

    const cards = await UserLoyaltyCard.find({
      establishmentId,
      loyaltyProgramId: program._id,
    }).lean();

    const totalCards = cards.length;
    const activeCards = cards.filter((c: any) => c.status === "active").length;
    const rewardAvailableCards = cards.filter(
      (c: any) => c.status === "reward_available",
    ).length;

    const totalCompletedCards = cards.reduce(
      (sum: number, c: any) => sum + Number(c.completedCardsCount || 0),
      0,
    );

    const totalDistributedStamps = cards.reduce(
      (sum: number, c: any) =>
        sum +
        Number(c.currentStamps || 0) +
        Number(c.completedCardsCount || 0) * Number(program.stampGoal || 10),
      0,
    );

    return res.status(200).json({
      establishmentId,
      program,
      stats: {
        totalCards,
        activeCards,
        rewardAvailableCards,
        totalCompletedCards,
        totalDistributedStamps,
      },
    });
  } catch (error: any) {
    Retour.error(
      `getLoyaltyStatsByEstablishment error: ${error?.message || error}`,
    );
    return res.status(500).json({ message: "Failed to get loyalty stats" });
  }
};

export default {
  getMyLoyaltyCards,
  getMyLoyaltyCardByEstablishment,
  createLoyaltyProgram,
  updateLoyaltyProgram,
  deleteLoyaltyProgram,
  getEstablishmentLoyaltyPrograms,
  scanLoyaltyCard,
  redeemLoyaltyReward,
  getLoyaltyStatsByEstablishment,
};
