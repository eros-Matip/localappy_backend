import { NextFunction, Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
import mongoose from "mongoose";

// Models
import Admin from "../models/Admin";
import Establishment from "../models/Establishment";
import Event from "../models/Event";
import Registration from "../models/Registration";
import Customer from "../models/Customer"; // optionnel si tu veux activeUsers

import Retour from "../library/Retour";
import { AdModel } from "../models/Ads";

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

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const dashboard = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);
    const now = new Date();

    // option : supprime ce sample une fois debug terminé
    const sample = await Event.findOne({ isDraft: false })
      .select("isDraft")
      .lean();

    // ----------------------------
    // 1) KPIs globaux
    // ----------------------------

    const nonDraftMatch = { isDraft: { $ne: true } };

    const totalEstablishmentsPromise = Establishment.countDocuments({});

    // ✅ Actifs = établissements avec au moins 1 event non-draft (peu importe la date)
    const activeEstablishmentsPromise = Establishment.aggregate([
      { $match: { events: { $exists: true, $not: { $size: 0 } } } },
      {
        $lookup: {
          from: "events",
          localField: "events",
          foreignField: "_id",
          as: "evts",
        },
      },
      {
        $project: {
          hasNonDraft: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$evts",
                    as: "e",
                    cond: { $ne: ["$$e.isDraft", true] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      { $match: { hasNonDraft: true } },
      { $count: "count" },
    ]).then((r) => r[0]?.count ?? 0);

    // Events non-draft dans la période (par startingDate)
    const totalEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      startingDate: { $gte: from, $lte: to },
    });

    // Upcoming = non-draft & endingDate > now
    const upcomingEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      endingDate: { $gt: now },
    });

    // Inscriptions (places) sur la période (createdAt)
    const totalRegistrationsPromise = Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$quantity", 0] } },
        },
      },
    ]).then((r) => r[0]?.total ?? 0);

    const [
      totalEstablishments,
      activeEstablishments,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
    ] = await Promise.all([
      totalEstablishmentsPromise,
      activeEstablishmentsPromise,
      totalEventsPromise,
      upcomingEventsPromise,
      totalRegistrationsPromise,
    ]);

    const kpis = {
      totalEstablishments,
      activeEstablishments,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
    };

    // ----------------------------
    // 2) Charts
    // ----------------------------

    // 2.a) registrationsByDay (date -> total places)
    const registrationsByDay = await Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          value: { $sum: { $ifNull: ["$quantity", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: { year: "$_id.y", month: "$_id.m", day: "$_id.d" },
          },
          value: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // 2.b) eventsByMonth (mois -> nb events)
    const eventsByMonth = await Event.aggregate([
      {
        $match: {
          ...nonDraftMatch,
          startingDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: "$startingDate" },
            m: { $month: "$startingDate" },
          },
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: {
            $dateFromParts: { year: "$_id.y", month: "$_id.m", day: 1 },
          },
          value: 1,
        },
      },
      { $sort: { month: 1 } },
    ]);

    // ✅ 2.c) eventsByCity (corrigé via Establishment.events -> Event)
    const eventsByCity = await Establishment.aggregate([
      { $match: { events: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: "$events" },
      {
        $lookup: {
          from: "events",
          localField: "events",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          "evt.startingDate": { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$address.city", "Inconnu"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, city: "$_id", value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]);

    // 2.d) eventsByCategory (inchangé, mais filtre nonDraft robuste)
    const eventsByCategory = await Event.aggregate([
      {
        $match: { ...nonDraftMatch, startingDate: { $gte: from, $lte: to } },
      },
      {
        $project: {
          category: {
            $cond: [
              { $isArray: "$theme" },
              { $arrayElemAt: ["$theme", 0] },
              "$theme",
            ],
          },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$category", "Sans catégorie"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, category: "$_id", value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 10 },
    ]);

    const charts = {
      registrationsByDay,
      eventsByMonth,
      eventsByCity,
      eventsByCategory,
    };

    // ----------------------------
    // 3) Top établissements (par inscriptions) ✅ corrigé
    // ----------------------------
    // Registration -> Event -> Establishment (via $in dans Establishment.events)
    const topEstablishments = await Registration.aggregate([
      { $match: { createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) } } },

      {
        $lookup: {
          from: "events",
          localField: "event", // ⚠️ adapte si ton champ s'appelle "eventId"
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      { $match: { "evt.isDraft": { $ne: true } } },

      {
        $lookup: {
          from: "establishments",
          let: { eventId: "$evt._id" },
          pipeline: [
            { $match: { $expr: { $in: ["$$eventId", "$events"] } } },
            { $project: { name: 1, "address.city": 1 } },
          ],
          as: "est",
        },
      },
      { $unwind: "$est" },

      {
        $group: {
          _id: "$est._id",
          registrations: { $sum: { $ifNull: ["$quantity", 0] } },
          eventsSet: { $addToSet: "$evt._id" },
          name: { $first: "$est.name" },
          city: { $first: "$est.address.city" },
        },
      },
      {
        $project: {
          _id: 0,
          establishmentId: "$_id",
          registrations: 1,
          events: { $size: "$eventsSet" },
          name: 1,
          city: 1,
        },
      },
      { $sort: { registrations: -1 } },
      { $limit: 8 },
    ]);

    // ----------------------------
    // 4) Activité récente (feed) ✅ corrigé (on retire establishment des selects)
    // ----------------------------
    const [recentRegs, recentEvents] = await Promise.all([
      Registration.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select("quantity createdAt event")
        .lean(),
      Event.find({ ...nonDraftMatch })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("title createdAt startingDate")
        .lean(),
    ]);

    const recentRegEventIds = recentRegs
      .map((r: any) => r.event)
      .filter((id: any) => mongoose.isValidObjectId(id));

    const regEvents = await Event.find({ _id: { $in: recentRegEventIds } })
      .select("title")
      .lean();

    const regEventMap = new Map<string, any>(
      regEvents.map((e: any) => [String(e._id), e]),
    );

    const recentActivity = [
      ...recentEvents.map((e: any) => ({
        type: "event_published",
        date: e.createdAt,
        label: e.title,
        refId: e._id,
      })),
      ...recentRegs.map((r: any) => {
        const evt = regEventMap.get(String(r.event));
        return {
          type: "registration",
          date: r.createdAt,
          label: evt?.title ? `Inscription: ${evt.title}` : "Inscription",
          refId: r._id,
          meta: { quantity: r.quantity ?? 0 },
        };
      }),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 12);

    // ----------------------------
    // 5) Réponse
    // ----------------------------
    return res.status(200).json({
      range: { from, to },
      kpis,
      charts,
      tables: {
        topEstablishments,
        recentActivity,
      },
    });
  } catch (error: any) {
    Retour.error(`Admin dashboard error: ${error?.message || error}`);
    return res.status(500).json({
      error: "Failed to load admin dashboard",
      details: error?.message || error,
    });
  }
};

const nonDraftMatch = { isDraft: { $ne: true } };

type DateRange = { from: Date; to: Date };

const parseRange = (req: Request): DateRange => {
  const now = new Date();
  const fromStr = String(req.query.from || "");
  const toStr = String(req.query.to || "");

  const from = fromStr
    ? new Date(fromStr)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = toStr ? new Date(toStr) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range. Use ?from=YYYY-MM-DD&to=YYYY-MM-DD");
  }
  return { from, to };
};

/**
 * Normalise en UTC sur minuit et construit une borne exclusive (+1 jour).
 * On évite les soucis timezone + on aide Mongo à utiliser les index range.
 */
const startUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const addDaysUTC = (d: Date, days: number) =>
  new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * 1) SUMMARY
 * GET /admin/dashboard/summary?from&to
 */
const fillMonths = (
  from: Date,
  to: Date,
  data: { month: Date; value: number }[],
) => {
  const map = new Map(
    data.map((d) => {
      const key = `${d.month.getUTCFullYear()}-${String(d.month.getUTCMonth() + 1).padStart(2, "0")}`;
      return [key, d.value];
    }),
  );

  const out: { month: Date; value: number }[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

  while (cur <= end) {
    const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ month: new Date(cur), value: map.get(key) ?? 0 });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }

  return out;
};

const summary = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);
    const now = new Date();

    // Bornes UTC propres
    const fromUTC = startUTC(from);
    const toUTCExclusive = addDaysUTC(startUTC(to), 1);

    // Requêtes “range” (index-friendly)
    const dateRangeMatch = { $gte: fromUTC, $lt: toUTCExclusive };

    // ----------------------------
    // 1) KPIs
    // ----------------------------
    const totalEstablishmentsPromise = Establishment.countDocuments({});

    /**
     * Active establishments:
     * - on récupère la liste des establishmentIds qui ont au moins 1 event non-draft
     * - puis on compte ceux activés
     *
     * -> évite un $lookup sur potentiellement des milliers d'events
     */
    const activeEstablishmentsPromise = Event.distinct(
      "organizer.establishment",
      {
        ...nonDraftMatch,
        "organizer.establishment": { $ne: null },
      },
    ).then(async (ids: any[]) => {
      const validIds = ids
        .map((id) => String(id))
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (validIds.length === 0) return 0;

      return Establishment.countDocuments({
        _id: { $in: validIds },
        activated: true,
      });
    });

    const totalEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      startingDate: dateRangeMatch,
    });

    const upcomingEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      endingDate: { $gt: now },
    });

    const totalRegistrationsPromise = Registration.aggregate([
      { $match: { createdAt: dateRangeMatch } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$quantity", 0] } },
        },
      },
    ])
      .option({ maxTimeMS: 25000 })
      .then((r) => r[0]?.total ?? 0);

    const [
      totalEstablishments,
      activeEstablishments,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
    ] = await Promise.all([
      totalEstablishmentsPromise,
      activeEstablishmentsPromise,
      totalEventsPromise,
      upcomingEventsPromise,
      totalRegistrationsPromise,
    ]);

    // ----------------------------
    // 2) Charts
    // ----------------------------

    // 2.a) registrationsByDay
    const registrationsByDay = await Registration.aggregate([
      { $match: { createdAt: dateRangeMatch } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          value: { $sum: { $ifNull: ["$quantity", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: { year: "$_id.y", month: "$_id.m", day: "$_id.d" },
          },
          value: 1,
        },
      },
      { $sort: { date: 1 } },
    ]).option({ maxTimeMS: 25000 });

    // 2.b) eventsByMonth
    const eventsByMonthRaw = await Event.aggregate([
      {
        $match: {
          ...nonDraftMatch,
          startingDate: dateRangeMatch,
        },
      },
      {
        $group: {
          _id: {
            y: { $year: "$startingDate" },
            m: { $month: "$startingDate" },
          },
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: {
            $dateFromParts: { year: "$_id.y", month: "$_id.m", day: 1 },
          },
          value: 1,
        },
      },
      { $sort: { month: 1 } },
    ]).option({ maxTimeMS: 25000 });

    const eventsByMonth = fillMonths(
      fromUTC,
      addDaysUTC(toUTCExclusive, -1),
      eventsByMonthRaw,
    );

    // ----------------------------
    // 3) Réponse
    // ----------------------------
    return res.status(200).json({
      range: { from: fromUTC, to: addDaysUTC(toUTCExclusive, -1) },
      kpis: {
        totalEstablishments,
        activeEstablishments,
        totalEvents,
        upcomingEvents,
        totalRegistrations,
      },
      charts: { registrationsByDay, eventsByMonth },
    });
  } catch (error: any) {
    Retour.error(`Admin dashboard summary error: ${error?.message || error}`);
    return res.status(500).json({
      error: "Failed to load dashboard summary",
      details: error?.message || error,
    });
  }
};

/**
 * 2) DISTRIBUTION
 * GET /admin/dashboard/distribution?from&to
 */
const distribution = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    // eventsByCity : Event -> Establishment via organizer.establishment
    const eventsByCity = await Event.aggregate([
      {
        $match: {
          ...nonDraftMatch,
          startingDate: { $gte: from, $lte: to },
          "organizer.establishment": { $ne: null },
        },
      },
      {
        $lookup: {
          from: "establishments",
          localField: "organizer.establishment",
          foreignField: "_id",
          as: "est",
        },
      },
      { $unwind: { path: "$est", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$est.address.city", "Inconnu"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, city: "$_id", value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]);

    // eventsByCategory (theme est [string])
    const eventsByCategory = await Event.aggregate([
      { $match: { ...nonDraftMatch, startingDate: { $gte: from, $lte: to } } },
      {
        $project: {
          category: {
            $cond: [
              {
                $and: [
                  { $isArray: "$theme" },
                  { $gt: [{ $size: "$theme" }, 0] },
                ],
              },
              { $arrayElemAt: ["$theme", 0] },
              "Sans catégorie",
            ],
          },
        },
      },
      { $group: { _id: "$category", value: { $sum: 1 } } },
      { $project: { _id: 0, category: "$_id", value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      range: { from, to },
      charts: { eventsByCity, eventsByCategory },
    });
  } catch (error: any) {
    Retour.error(
      `Admin dashboard distribution error: ${error?.message || error}`,
    );
    return res.status(500).json({
      error: "Failed to load dashboard distribution",
      details: error?.message || error,
    });
  }
};

/**
 * 3) TOP ESTABLISHMENTS
 * GET /admin/dashboard/top-establishments?from&to
 */
const topEstablishments = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    const top = await Registration.aggregate([
      { $match: { createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) } } },

      // join event
      {
        $lookup: {
          from: "events",
          localField: "event", // ⚠️ adapte si "eventId"
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          "evt.organizer.establishment": { $ne: null },
        },
      },

      // group by establishment id
      {
        $group: {
          _id: "$evt.organizer.establishment",
          registrations: { $sum: { $ifNull: ["$quantity", 0] } },
          eventsSet: { $addToSet: "$evt._id" },
        },
      },
      {
        $project: {
          _id: 0,
          establishmentId: "$_id",
          registrations: 1,
          events: { $size: "$eventsSet" },
        },
      },
      { $sort: { registrations: -1 } },
      { $limit: 8 },

      // join establishment details
      {
        $lookup: {
          from: "establishments",
          localField: "establishmentId",
          foreignField: "_id",
          as: "est",
        },
      },
      { $unwind: { path: "$est", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          establishmentId: 1,
          registrations: 1,
          events: 1,
          name: "$est.name",
          city: "$est.address.city",
        },
      },
    ]);

    return res.status(200).json({
      range: { from, to },
      tables: { topEstablishments: top },
    });
  } catch (error: any) {
    Retour.error(
      `Admin dashboard topEstablishments error: ${error?.message || error}`,
    );
    return res.status(500).json({
      error: "Failed to load top establishments",
      details: error?.message || error,
    });
  }
};

/**
 * 4) RECENT ACTIVITY
 * GET /admin/dashboard/recent-activity?limit=12
 */
const recentActivity = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 12), 50);

    const [recentRegs, recentEvents] = await Promise.all([
      Registration.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("quantity createdAt event")
        .lean(),
      Event.find({ ...nonDraftMatch })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title createdAt startingDate")
        .lean(),
    ]);

    const recentRegEventIds = recentRegs
      .map((r: any) => r.event)
      .filter((id: any) => mongoose.isValidObjectId(id));

    const regEvents = await Event.find({ _id: { $in: recentRegEventIds } })
      .select("title")
      .lean();
    const regEventMap = new Map<string, any>(
      regEvents.map((e: any) => [String(e._id), e]),
    );

    const feed = [
      ...recentEvents.map((e: any) => ({
        type: "event_published",
        date: e.createdAt,
        label: e.title,
        refId: e._id,
      })),
      ...recentRegs.map((r: any) => ({
        type: "registration",
        date: r.createdAt,
        label: regEventMap.get(String(r.event))?.title
          ? `Inscription: ${regEventMap.get(String(r.event)).title}`
          : "Inscription",
        refId: r._id,
        meta: { quantity: r.quantity ?? 0 },
      })),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, limit);

    return res.status(200).json({ tables: { recentActivity: feed } });
  } catch (error: any) {
    Retour.error(
      `Admin dashboard recentActivity error: ${error?.message || error}`,
    );
    return res.status(500).json({
      error: "Failed to load recent activity",
      details: error?.message || error,
    });
  }
};

const customersDashboard = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    // ----------------------------
    // 1) KPIs clients
    // ----------------------------

    const totalCustomersPromise = Customer.countDocuments({});

    const newCustomersPromise = Customer.countDocuments({
      createdAt: { $gte: from, $lte: to },
    });

    const premiumCustomersPromise = Customer.countDocuments({
      premiumStatus: true,
    });

    // Client actif = a réservé ou participé à ≥ 1 event
    const activeCustomersPromise = Customer.countDocuments({
      $or: [
        { eventsReserved: { $exists: true, $not: { $size: 0 } } },
        { eventsAttended: { $exists: true, $not: { $size: 0 } } },
      ],
    });

    const [totalCustomers, newCustomers, premiumCustomers, activeCustomers] =
      await Promise.all([
        totalCustomersPromise,
        newCustomersPromise,
        premiumCustomersPromise,
        activeCustomersPromise,
      ]);

    const inactiveCustomers = totalCustomers - activeCustomers;

    // ----------------------------
    // 2) Répartition par ville
    // ----------------------------

    const customersByCity = await Customer.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$account.city", "Inconnue"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, city: "$_id", value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]);

    // ----------------------------
    // 3) Engagement moyen
    // ----------------------------

    const engagement = await Customer.aggregate([
      {
        $project: {
          reservedCount: { $size: { $ifNull: ["$eventsReserved", []] } },
          attendedCount: { $size: { $ifNull: ["$eventsAttended", []] } },
          favoritesCount: { $size: { $ifNull: ["$eventsFavorites", []] } },
        },
      },
      {
        $group: {
          _id: null,
          avgReserved: { $avg: "$reservedCount" },
          avgAttended: { $avg: "$attendedCount" },
          avgFavorites: { $avg: "$favoritesCount" },
        },
      },
      {
        $project: {
          _id: 0,
          avgReserved: { $round: ["$avgReserved", 2] },
          avgAttended: { $round: ["$avgAttended", 2] },
          avgFavorites: { $round: ["$avgFavorites", 2] },
        },
      },
    ]);

    // ----------------------------
    // 4) Top clients (par réservations)
    // ----------------------------

    const topCustomers = await Customer.aggregate([
      {
        $project: {
          firstname: "$account.firstname",
          name: "$account.name",
          city: "$account.city",
          reservedCount: { $size: { $ifNull: ["$eventsReserved", []] } },
        },
      },
      { $match: { reservedCount: { $gt: 0 } } },
      { $sort: { reservedCount: -1 } },
      { $limit: 10 },
    ]);

    // ----------------------------
    // 5) Réponse
    // ----------------------------

    return res.status(200).json({
      range: { from, to },
      kpis: {
        totalCustomers,
        newCustomers,
        premiumCustomers,
        activeCustomers,
        inactiveCustomers,
      },
      charts: {
        customersByCity,
      },
      engagement: engagement[0] || {
        avgReserved: 0,
        avgAttended: 0,
        avgFavorites: 0,
      },
      tables: {
        topCustomers,
      },
    });
  } catch (error: any) {
    Retour.error(`Admin customers dashboard error: ${error?.message || error}`);
    return res.status(500).json({
      error: "Failed to load customers dashboard",
      details: error?.message || error,
    });
  }
};

const adsDashboard = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    // --------------------------------------------------
    // 1) KPIs
    // --------------------------------------------------

    const totalAdsPromise = AdModel.countDocuments({});

    const adsWithEventPromise = AdModel.countDocuments({
      event: { $exists: true, $ne: null },
    });

    // ✅ TOTAL clics (peu importe la date)
    const totalClicksPromise = AdModel.aggregate([
      { $unwind: "$clics" },
      { $count: "total" },
    ]).then((r) => r[0]?.total ?? 0);

    // ✅ Clics sur la période (robuste : accepte date null / absente)
    const periodClicksPromise = AdModel.aggregate([
      { $unwind: "$clics" },
      {
        $match: {
          $or: [
            {
              "clics.date": {
                $gte: startOfDay(from),
                $lte: endOfDay(to),
              },
            },
            { "clics.date": { $exists: false } },
            { "clics.date": null },
          ],
        },
      },
      { $count: "total" },
    ]).then((r) => r[0]?.total ?? 0);

    const [totalAds, adsWithEvent, totalClicks, periodClicks] =
      await Promise.all([
        totalAdsPromise,
        adsWithEventPromise,
        totalClicksPromise,
        periodClicksPromise,
      ]);

    const avgClicksPerAd =
      totalAds > 0 ? Number((totalClicks / totalAds).toFixed(2)) : 0;

    // --------------------------------------------------
    // 2) Clics par jour (uniquement ceux avec date valide)
    // --------------------------------------------------

    const clicksByDay = await AdModel.aggregate([
      { $unwind: "$clics" },
      { $match: { "clics.date": { $type: "date" } } },
      {
        $group: {
          _id: {
            y: { $year: "$clics.date" },
            m: { $month: "$clics.date" },
            d: { $dayOfMonth: "$clics.date" },
          },
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.y",
              month: "$_id.m",
              day: "$_id.d",
            },
          },
          value: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // --------------------------------------------------
    // 3) Clics par source
    // --------------------------------------------------

    const clicksBySource = await AdModel.aggregate([
      { $unwind: "$clics" },
      {
        $group: {
          _id: { $ifNull: ["$clics.source", "Inconnue"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, source: "$_id", value: 1 } },
      { $sort: { value: -1 } },
    ]);

    // --------------------------------------------------
    // 4) Top publicités
    // --------------------------------------------------

    const topAds = await AdModel.aggregate([
      {
        $project: {
          title: 1,
          event: 1,
          clicks: { $size: { $ifNull: ["$clics", []] } },
        },
      },
      { $match: { clicks: { $gt: 0 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    // --------------------------------------------------
    // 5) Réponse finale
    // --------------------------------------------------

    return res.status(200).json({
      range: { from, to },
      kpis: {
        totalAds,
        adsWithEvent,
        totalClicks,
        periodClicks,
        avgClicksPerAd,
      },
      charts: {
        clicksByDay,
        clicksBySource,
      },
      tables: {
        topAds,
      },
    });
  } catch (error: any) {
    Retour.error(`Admin ads dashboard error: ${error?.message || error}`);
    return res.status(500).json({
      error: "Failed to load ads dashboard",
      details: error?.message || error,
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
        : res.status(404).json({ message: "Not found" }),
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

export default {
  createAdmin,
  dashboard,
  summary,
  distribution,
  topEstablishments,
  recentActivity,
  customersDashboard,
  adsDashboard,
  updateAdmin,
  deleteAdmin,
};
