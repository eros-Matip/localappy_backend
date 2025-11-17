import { NextFunction, Request, Response } from "express";

// Models
import Registration from "../models/Registration";
import mongoose, { Types } from "mongoose";
import Retour from "../library/Retour";
import Establishment from "../models/Establishment";
import Event from "../models/Event";

const readRegistrationByEstablishment = async (req: Request, res: Response) => {
  try {
    const { establishmentId } = req.params;
    const tz = (req.query.tz as string) || "Europe/Paris";

    if (!establishmentId || !mongoose.isValidObjectId(establishmentId)) {
      return res.status(400).json({ error: "Invalid establishmentId" });
    }

    const est = await Establishment.findById(establishmentId);
    if (!est) {
      return res.status(404).json({ error: "Establishment not found" });
    }

    const estObjectId = new mongoose.Types.ObjectId(establishmentId);

    const pipeline: mongoose.PipelineStage[] = [
      // 1) On joint l'event à partir des registrations
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },

      // 2) Filtre : registrations des events de CET établissement + status
      {
        $match: {
          "event.organizer.establishment": estObjectId,
          status: { $in: ["paid", "confirmed"] }, // commente si tu veux voir tous les statuts
        },
      },

      // 3) Lookup du customer
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      // 4) Ajout des clés de date + timestamp
      {
        $addFields: {
          _dayKey: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: tz,
            },
          },
          _ts: { $toLong: "$date" },
        },
      },

      // 5) Groupement par event + jour
      {
        $group: {
          _id: { event: "$event._id", dayKey: "$_dayKey" },

          qtyForThisDate: { $sum: "$quantity" },
          tsMax: { $max: "$_ts" },

          // 👉 On garde les registrations + infos customer
          registrations: {
            $push: {
              _id: "$_id",
              bill: "$bill",
              invoiceNumber: "$invoiceNumber",
              price: "$price",
              quantity: "$quantity",
              checkInStatus: "$checkInStatus",

              customer: {
                _id: "$customer._id",
                // adapte selon ton schéma Customer
                firstname: "$customer.account.firstname",
                lastname: "$customer.account.name",
                email: "$customer.email",
              },
            },
          },

          checkedInCount: {
            $sum: {
              $cond: [
                { $eq: ["$checkInStatus", "checked-in"] },
                "$quantity",
                0,
              ],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$checkInStatus", "pending"] }, "$quantity", 0],
            },
          },
          noShowCount: {
            $sum: {
              $cond: [{ $eq: ["$checkInStatus", "no-show"] }, "$quantity", 0],
            },
          },

          totalPaid: { $sum: "$price" },

          eventDoc: { $first: "$event" },
        },
      },

      // 6) Projection intermédiaire : 1 ligne = (date, event)
      {
        $project: {
          _id: 0,
          dayKey: "$_id.dayKey",
          regTs: "$tsMax",

          eventId: "$eventDoc._id",
          title: "$eventDoc.title",
          startingDate: "$eventDoc.startingDate",
          endingDate: "$eventDoc.endingDate",
          image: "$eventDoc.image",
          theme: "$eventDoc.theme",
          address: "$eventDoc.address",

          registrations: 1,

          checkInCounts: {
            checkedIn: "$checkedInCount",
            pending: "$pendingCount",
            noShow: "$noShowCount",
          },

          qtyForThisDate: "$qtyForThisDate",
          totalPaid: "$totalPaid",
        },
      },

      // 7) Regroupement par DATE, avec un tableau d'events
      {
        $group: {
          _id: "$dayKey",
          date: { $first: "$dayKey" },
          regTs: { $max: "$regTs" },
          events: {
            $push: {
              eventId: "$eventId",
              title: "$title",
              startingDate: "$startingDate",
              endingDate: "$endingDate",
              image: "$image",
              theme: "$theme",
              address: "$address",

              registrations: "$registrations", // 🔥 chaque registration a maintenant son customer

              checkInCounts: "$checkInCounts",
              qtyForThisDate: "$qtyForThisDate",
              totalPaid: "$totalPaid",
            },
          },
        },
      },

      // 8) Tri des dates (plus récentes d'abord)
      { $sort: { regTs: -1 } },
    ];

    const rows = await Registration.aggregate(pipeline).allowDiskUse(true);
    Retour.info(
      `Registration grouped by date & event for establishment ${establishmentId}, items: ${rows.length}`
    );
    return res.status(200).json({ items: rows });
  } catch (error: any) {
    console.error("readRegistrationByEstablishment error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

const getUserReservationsGroupedByDate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.body.admin;
    const tz = (req.query.tz as string) || "Europe/Paris";

    if (!user) {
      Retour.error("Invalid user");
      return res.status(400).json({ error: "Invalid user" });
    }

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: { customer: user._id, status: { $in: ["paid", "confirmed"] } },
      },
      {
        $addFields: {
          _dayKey: {
            $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: tz },
          },
          _ts: { $toLong: "$date" },
        },
      },
      {
        $group: {
          _id: { event: "$event", dayKey: "$_dayKey" },
          qtyForThisDate: { $sum: "$quantity" },
          tsMax: { $max: "$_ts" },

          // on garde les infos registration utiles (incluant checkInStatus)
          registrations: {
            $push: {
              _id: "$_id",
              bill: "$bill",
              invoiceNumber: "$invoiceNumber",
              price: "$price",
              checkInStatus: "$checkInStatus", // 👈 ajouté
            },
          },

          // totaux par statut de check-in
          checkedInCount: {
            $sum: {
              $cond: [
                { $eq: ["$checkInStatus", "checked-in"] },
                "$quantity",
                0,
              ],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$checkInStatus", "pending"] }, "$quantity", 0],
            },
          },
          noShowCount: {
            $sum: {
              $cond: [{ $eq: ["$checkInStatus", "no-show"] }, "$quantity", 0],
            },
          },

          totalPaid: { $sum: "$price" },
        },
      },
      {
        $project: {
          eventId: "$_id.event",
          _regKey: "$_id.dayKey",
          _regTs: "$tsMax",
          _qtyForThisDate: "$qtyForThisDate",

          // dérivés depuis registrations
          _registrationIds: "$registrations._id",
          _bills: "$registrations.bill",
          _invoiceNumbers: "$registrations.invoiceNumber",

          // expose aussi tous les statuts si besoin fin
          _checkInStatuses: "$registrations.checkInStatus",

          // comptes par statut
          _checkInCounts: {
            checkedIn: "$checkedInCount",
            pending: "$pendingCount",
            noShow: "$noShowCount",
          },

          _totalPaid: "$totalPaid",
          _id: 0,
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $project: {
          _id: "$event._id",
          title: "$event.title",
          startingDate: "$event.startingDate",
          endingDate: "$event.endingDate",
          image: "$event.image",
          theme: "$event.theme",
          address: "$event.address",

          _regKey: 1,
          _regTs: 1,
          _qtyForThisDate: 1,
          _registrationIds: 1,
          _bills: 1,
          _invoiceNumbers: 1,
          _totalPaid: 1,

          // nouveaux champs check-in
          _checkInStatuses: 1,
          _checkInCounts: 1,
        },
      },
      { $sort: { _regTs: -1 } },
    ];

    const rows = await Registration.aggregate(pipeline).allowDiskUse(true);
    Retour.info("Registration readed");
    return res.status(200).json({ items: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

const updateRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const registrationId = req.params.registrationId;
  return Registration.findById(registrationId).then(async (registration) => {
    if (!registration) {
      return res.status(404).json({ message: "Not found" });
    } else {
      registration.set(req.body);
      return registration
        .save()
        .then((registration) =>
          res.status(201).json({ registration: registration })
        )
        .catch((error) => res.status(500).json({ error: error.message }));
    }
  });
};

export async function validateRegistrationAndCheckIn(params: {
  registrationId?: string;
  ticketNumber?: string;
  merchantId: string;
}) {
  const { registrationId, ticketNumber, merchantId } = params;

  // 1️⃣ Recherche de la registration
  const query: any = {};
  if (registrationId) query._id = registrationId;
  if (ticketNumber) query.ticketNumber = ticketNumber;

  const reg = await Registration.findOne(query);
  if (!reg) {
    throw new Error("REGISTRATION_NOT_FOUND");
  }

  // 2️⃣ Idempotence — déjà scanné
  if (reg.checkInStatus === "checked-in") {
    return { code: "ALREADY_SCANNED" as const, registration: reg };
  }

  // 3️⃣ Vérification du statut autorisé
  const allowedStatuses = ["paid", "confirmed"];
  if (!allowedStatuses.includes(reg.status)) {
    throw new Error("REGISTRATION_NOT_ELIGIBLE");
  }

  // 4️⃣ Mise à jour du check-in
  reg.checkInStatus = "checked-in";
  reg.checkedInAt = new Date();
  reg.checkedInBy = new Types.ObjectId(merchantId);

  await reg.save();

  // 5️⃣ Retour complet pour le socket
  return {
    code: "OK" as const,
    registration: reg,
  };
}

const deleteRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const registrationId = req.params.registrationId;

  return Registration.findByIdAndDelete(registrationId)
    .then((registration) =>
      registration
        ? res.status(200).json({ message: "CRE is deleted" })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

export default {
  readRegistrationByEstablishment,
  getUserReservationsGroupedByDate,
  updateRegistration,
  deleteRegistration,
};
