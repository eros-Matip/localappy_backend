import { Request, Response } from "express";
import mongoose from "mongoose";

import Event from "../models/Event";
import EventPresence from "../models/EventPresence";
import EventLivePhoto from "../models/EventLivePhoto";
import Retour from "../library/Retour";
import { getLiveNsp } from "../utils/socket";

const PRESENCE_TIMEOUT_MINUTES = 20;

const isEventLiveNow = (event: any) => {
  const now = new Date();

  return (
    !!event?.startingDate &&
    !!event?.endingDate &&
    new Date(event.startingDate) <= now &&
    new Date(event.endingDate) >= now &&
    !event?.isDraft
  );
};

const getActiveSinceDate = () => {
  return new Date(Date.now() - PRESENCE_TIMEOUT_MINUTES * 60 * 1000);
};

const getAuthenticatedCustomerId = (req: Request) => {
  return (req as any).customer?._id || req.body?.admin?._id;
};

const joinPresence = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const customerId = getAuthenticatedCustomerId(req);
    const source = req.body?.source || "manual";

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    if (!customerId || !mongoose.isValidObjectId(String(customerId))) {
      return res.status(401).json({ message: "Utilisateur non autorisé" });
    }

    if (!["manual", "geo", "qr"].includes(source)) {
      return res.status(400).json({ message: "source invalide" });
    }

    const event = await Event.findById(eventId).select(
      "_id title startingDate endingDate isDraft",
    );

    if (!event) {
      return res.status(404).json({ message: "Événement introuvable" });
    }

    if (!isEventLiveNow(event)) {
      return res.status(400).json({
        message: "Cet événement n'est pas en cours",
      });
    }

    const now = new Date();

    const presence = await EventPresence.findOneAndUpdate(
      {
        event: event._id,
        customer: customerId,
      },
      {
        $set: {
          isActive: true,
          lastSeenAt: now,
          source,
        },
        $setOnInsert: {
          joinedAt: now,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    const activeSince = getActiveSinceDate();

    const participantsCount = await EventPresence.countDocuments({
      event: event._id,
      isActive: true,
      lastSeenAt: { $gte: activeSince },
    });

    const liveNsp = getLiveNsp();

    liveNsp.to(`event:${event._id}`).emit("live:participantsUpdated", {
      eventId: String(event._id),
      participantsCount,
    });

    Retour.info(`Présence enregistrée sur l'événement ${event.title}`);

    return res.status(200).json({
      message: "Présence enregistrée",
      presence,
      participantsCount,
    });
  } catch (error) {
    console.error("Erreur joinPresence:", error);
    return res.status(500).json({
      message: "Erreur lors de l'enregistrement de présence",
      error,
    });
  }
};

const pingPresence = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const customerId = getAuthenticatedCustomerId(req);

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    if (!customerId || !mongoose.isValidObjectId(String(customerId))) {
      return res.status(401).json({ message: "Utilisateur non autorisé" });
    }

    const event = await Event.findById(eventId).select(
      "_id title startingDate endingDate isDraft",
    );

    if (!event) {
      return res.status(404).json({ message: "Événement introuvable" });
    }

    const presence = await EventPresence.findOneAndUpdate(
      {
        event: event._id,
        customer: customerId,
        isActive: true,
      },
      {
        $set: {
          lastSeenAt: new Date(),
        },
      },
      { new: true },
    );

    if (!presence) {
      return res.status(404).json({
        message: "Présence introuvable. Rejoignez d'abord l'événement.",
      });
    }

    const activeSince = getActiveSinceDate();

    const participantsCount = await EventPresence.countDocuments({
      event: event._id,
      isActive: true,
      lastSeenAt: { $gte: activeSince },
    });

    return res.status(200).json({
      message: "Ping mis à jour",
      presence,
      participantsCount,
    });
  } catch (error) {
    console.error("Erreur pingPresence:", error);
    return res.status(500).json({
      message: "Erreur lors du ping de présence",
      error,
    });
  }
};

const leavePresence = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const customerId = getAuthenticatedCustomerId(req);

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    if (!customerId || !mongoose.isValidObjectId(String(customerId))) {
      return res.status(401).json({ message: "Utilisateur non autorisé" });
    }

    const event = await Event.findById(eventId).select("_id title");

    if (!event) {
      return res.status(404).json({ message: "Événement introuvable" });
    }

    await EventPresence.findOneAndUpdate(
      {
        event: event._id,
        customer: customerId,
      },
      {
        $set: {
          isActive: false,
        },
      },
    );

    const activeSince = getActiveSinceDate();

    const participantsCount = await EventPresence.countDocuments({
      event: event._id,
      isActive: true,
      lastSeenAt: { $gte: activeSince },
    });

    const liveNsp = getLiveNsp();

    liveNsp.to(`event:${event._id}`).emit("live:participantsUpdated", {
      eventId: String(event._id),
      participantsCount,
    });

    return res.status(200).json({
      message: "Présence terminée",
      participantsCount,
    });
  } catch (error) {
    console.error("Erreur leavePresence:", error);
    return res.status(500).json({
      message: "Erreur lors de la sortie",
      error,
    });
  }
};

const getMyPresence = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const customerId = getAuthenticatedCustomerId(req);

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    if (!customerId || !mongoose.isValidObjectId(String(customerId))) {
      return res.status(401).json({ message: "Utilisateur non autorisé" });
    }

    const activeSince = getActiveSinceDate();

    const presence = await EventPresence.findOne({
      event: eventId,
      customer: customerId,
      isActive: true,
      lastSeenAt: { $gte: activeSince },
    }).lean();

    return res.status(200).json({
      isPresent: !!presence,
      presence: presence || null,
    });
  } catch (error) {
    console.error("Erreur getMyPresence:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération de la présence",
      error,
    });
  }
};

const getLiveEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const customerId = getAuthenticatedCustomerId(req);

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    const event = await Event.findById(eventId).select(
      "_id title startingDate endingDate isDraft",
    );

    if (!event) {
      return res.status(404).json({ message: "Événement introuvable" });
    }

    const activeSince = getActiveSinceDate();

    const isLive = isEventLiveNow(event);

    const participantsCount = await EventPresence.countDocuments({
      event: event._id,
      isActive: true,
      lastSeenAt: { $gte: activeSince },
    });

    const livePhotosCount = await EventLivePhoto.countDocuments({
      event: event._id,
      status: "approved",
    });

    const recentPhotos = await EventLivePhoto.find({
      event: event._id,
      status: "approved",
    })
      .populate({
        path: "customer",
        model: "Customer",
        select: "account.firstname account.lastname",
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    let userIsPresent = false;

    if (customerId && mongoose.isValidObjectId(String(customerId))) {
      const presence = await EventPresence.findOne({
        event: event._id,
        customer: customerId,
        isActive: true,
        lastSeenAt: { $gte: activeSince },
      }).lean();

      userIsPresent = !!presence;
    }

    return res.status(200).json({
      eventId: event._id,
      isLive,
      participantsCount,
      livePhotosCount,
      userIsPresent,
      recentPhotos,
    });
  } catch (error) {
    console.error("Erreur getLiveEvent:", error);

    return res.status(500).json({
      message: "Erreur récupération live event",
      error,
    });
  }
};

export default {
  joinPresence,
  pingPresence,
  leavePresence,
  getMyPresence,
  getLiveEvent,
};
