import { Request, Response } from "express";
import mongoose from "mongoose";
import cloudinary from "cloudinary";

import Event from "../models/Event";
import EventPresence from "../models/EventPresence";
import EventLivePhoto from "../models/EventLivePhoto";
import Retour from "../library/Retour";
import Establishment from "../models/Establishment";
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

const getAuthenticatedOwnerId = (req: Request) => {
  return (req as any).owner?._id || req.body?.owner?._id;
};

const uploadLivePhoto = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const customerId = getAuthenticatedCustomerId(req);
    const caption = req.body?.caption?.trim() || "";

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

    if (!isEventLiveNow(event)) {
      return res.status(400).json({
        message: "Impossible d'ajouter une photo sur un événement non en cours",
      });
    }

    const activeSince = getActiveSinceDate();

    const presence = await EventPresence.findOne({
      event: event._id,
      customer: customerId,
      isActive: true,
      lastSeenAt: { $gte: activeSince },
    });

    if (!presence) {
      return res.status(403).json({
        message:
          "Vous devez être présent sur l'événement pour publier une photo",
      });
    }

    const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
    const allFiles: Express.Multer.File[] = Object.values(filesObject).flat();

    if (!allFiles.length) {
      return res.status(400).json({
        message: "Aucune image n'a été envoyée",
      });
    }

    const uploadedPhotos = [];

    for (const file of allFiles) {
      const result = await cloudinary.v2.uploader.upload(file.path, {
        folder: `events/live/${event._id}`,
      });

      const photo = await EventLivePhoto.create({
        event: event._id,
        customer: customerId,
        imageUrl: result.secure_url,
        caption,
        status: "approved",
      });

      uploadedPhotos.push(photo);
    }

    const photosCount = await EventLivePhoto.countDocuments({
      event: event._id,
      status: "approved",
    });

    const liveNsp = getLiveNsp();

    liveNsp.to(`event:${event._id}`).emit("live:photosUpdated", {
      eventId: String(event._id),
      photosCount,
    });

    Retour.info(`Photo(s) live ajoutée(s) sur l'événement ${event.title}`);

    return res.status(201).json({
      message: "Photo(s) live ajoutée(s)",
      photos: uploadedPhotos,
      photosCount,
    });
  } catch (error) {
    console.error("Erreur uploadLivePhoto:", error);
    return res.status(500).json({
      message: "Erreur lors de l'upload des photos live",
      error,
    });
  }
};

const getLivePhotos = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    const event = await Event.findById(eventId).select("_id title");

    if (!event) {
      return res.status(404).json({ message: "Événement introuvable" });
    }

    const [photos, total] = await Promise.all([
      EventLivePhoto.find({
        event: event._id,
        status: "approved",
      })
        .populate({
          path: "customer",
          model: "Customer",
          select: "account.firstname account.lastname",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventLivePhoto.countDocuments({
        event: event._id,
        status: "approved",
      }),
    ]);

    return res.status(200).json({
      items: photos,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Erreur getLivePhotos:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des photos live",
      error,
    });
  }
};

const deleteLivePhoto = async (req: Request, res: Response) => {
  try {
    const { eventId, photoId } = req.params;
    const ownerId = getAuthenticatedOwnerId(req);

    if (!ownerId || !mongoose.isValidObjectId(String(ownerId))) {
      return res.status(401).json({ message: "Owner non authentifié" });
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    if (!mongoose.isValidObjectId(photoId)) {
      return res.status(400).json({ message: "photoId invalide" });
    }

    const establishmentFinded = await Establishment.findOne({
      events: eventId,
    });

    if (!establishmentFinded) {
      return res.status(404).json({ message: "Établissement introuvable" });
    }

    const ownerIds = Array.isArray(establishmentFinded.owner)
      ? establishmentFinded.owner.map((id: any) => String(id))
      : [];

    if (!ownerIds.includes(String(ownerId))) {
      return res.status(401).json({ message: "Owner non autorisé" });
    }

    const photo = await EventLivePhoto.findOne({
      _id: photoId,
      event: eventId,
    });

    if (!photo) {
      return res.status(404).json({ message: "Photo introuvable" });
    }

    await EventLivePhoto.findByIdAndDelete(photo._id);

    const photosCount = await EventLivePhoto.countDocuments({
      event: eventId,
      status: "approved",
    });

    const liveNsp = getLiveNsp();

    liveNsp.to(`event:${eventId}`).emit("live:photosUpdated", {
      eventId: String(eventId),
      photosCount,
    });

    return res.status(200).json({
      message: "Photo supprimée avec succès",
      photosCount,
    });
  } catch (error) {
    console.error("Erreur deleteLivePhoto:", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression de la photo",
      error,
    });
  }
};

const moderateLivePhoto = async (req: Request, res: Response) => {
  try {
    const { eventId, photoId } = req.params;
    const { status } = req.body;
    const ownerId = getAuthenticatedOwnerId(req);

    if (!ownerId || !mongoose.isValidObjectId(String(ownerId))) {
      return res.status(401).json({
        message: "Owner non authentifié",
      });
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "eventId invalide" });
    }

    if (!mongoose.isValidObjectId(photoId)) {
      return res.status(400).json({ message: "photoId invalide" });
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status invalide",
      });
    }

    const establishmentFinded = await Establishment.findOne({
      events: eventId,
    });

    if (!establishmentFinded) {
      return res.status(404).json({ message: "Établissement introuvable" });
    }

    const ownerIds = Array.isArray(establishmentFinded.owner)
      ? establishmentFinded.owner.map((id: any) => String(id))
      : [];

    if (!ownerIds.includes(String(ownerId))) {
      return res.status(401).json({ message: "Owner non autorisé" });
    }

    const photo = await EventLivePhoto.findOneAndUpdate(
      {
        _id: photoId,
        event: eventId,
      },
      {
        $set: { status },
      },
      { new: true },
    );

    if (!photo) {
      return res.status(404).json({ message: "Photo introuvable" });
    }

    const photosCount = await EventLivePhoto.countDocuments({
      event: eventId,
      status: "approved",
    });

    const liveNsp = getLiveNsp();

    liveNsp.to(`event:${eventId}`).emit("live:photosUpdated", {
      eventId: String(eventId),
      photosCount,
    });

    return res.status(200).json({
      message: "Photo modérée avec succès",
      photo,
      photosCount,
    });
  } catch (error) {
    console.error("Erreur moderateLivePhoto:", error);
    return res.status(500).json({
      message: "Erreur lors de la modération de la photo",
      error,
    });
  }
};

export default {
  uploadLivePhoto,
  getLivePhotos,
  deleteLivePhoto,
  moderateLivePhoto,
};
