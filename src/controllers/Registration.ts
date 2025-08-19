import { NextFunction, Request, Response } from "express";

// Models
import Registration from "../models/Registration";
import mongoose from "mongoose";
import Retour from "../library/Retour";

const readRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const registrationId = req.params.registrationId;

  return Registration.findById(registrationId)
    .then((registration) =>
      registration
        ? res.status(200).json({ message: registration })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
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
          registrations: {
            $push: {
              _id: "$_id",
              bill: "$bill",
              invoiceNumber: "$invoiceNumber",
              price: "$price",
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
          _registrationIds: "$registrations._id",
          _bills: "$registrations.bill",
          _invoiceNumbers: "$registrations.invoiceNumber",
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
  readRegistration,
  getUserReservationsGroupedByDate,
  updateRegistration,
  deleteRegistration,
};
