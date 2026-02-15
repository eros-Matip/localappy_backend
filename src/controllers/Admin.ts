import { Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
import mongoose from "mongoose";

// Models
import Admin from "../models/Admin";
import Establishment from "../models/Establishment";
import Event from "../models/Event";
import Registration from "../models/Registration";
import Customer from "../models/Customer";

import Retour from "../library/Retour";
import { AdModel } from "../models/Ads";

/* =========================
   HELPERS (dates)
========================= */
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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

/* =========================
   HELPERS (departments scope)
========================= */
const parseDepartments = (req: Request): string[] => {
  const raw = String(req.query.departments || "").trim(); // ex "64,40"
  if (!raw) return [];
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
};

const zipMatchForDepartments = (departments: string[]) => {
  if (!departments.length) return null;
  const escaped = departments.map((d) =>
    d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const re = new RegExp(`^(${escaped.join("|")})`);
  return { $regex: re };
};

/**
 * IMPORTANT:
 * - On scope par département via Establishment.address.zip
 * - On remonte ensuite les ids pour filtrer Event.organizer.establishment
 */
const getEstablishmentIdsByDepartments = async (departments: string[]) => {
  if (!departments.length) return null;

  const zipMatch = zipMatchForDepartments(departments);
  if (!zipMatch) return null;

  const ids = await Establishment.find({ "address.zip": zipMatch })
    .select("_id")
    .lean();

  return ids.map((x: any) => x._id);
};

/**
 * Construit les matchs scope (vide si pas de filtre)
 */
const buildScope = (establishmentIds: any[] | null) => {
  const scopeEstablishmentsMatch = establishmentIds
    ? { _id: { $in: establishmentIds } }
    : {};

  const scopeEventsMatch = establishmentIds
    ? { "organizer.establishment": { $in: establishmentIds } }
    : {};

  // Pour pipelines où on a déjà $lookup Event as "evt"
  const scopeEvtLookupMatch = establishmentIds
    ? { "evt.organizer.establishment": { $in: establishmentIds } }
    : {};

  return { scopeEstablishmentsMatch, scopeEventsMatch, scopeEvtLookupMatch };
};

/* =========================
   COMMON
========================= */
const nonDraftMatch = { isDraft: { $ne: true } };

/* =========================
   ADMIN CRUD
========================= */
const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name, firstname, phoneNumber, password, passwordConfirmed } =
      req.body;

    if (!email || !name || !firstname || !phoneNumber || !password) {
      return res
        .status(400)
        .json({ error: "Tous les champs requis doivent être remplis." });
    }

    if (password !== passwordConfirmed) {
      return res
        .status(400)
        .json({ error: "Les mots de passe ne correspondent pas." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email invalide." });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(409)
        .json({ error: "Un administrateur avec cet email existe déjà." });
    }

    const token: string = uid2(26);
    const salt: string = uid2(26);
    const hash: string = SHA256(password + salt).toString(encBase64);

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

    await admin.save();

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

/* =========================
   0) DASHBOARD (full)
   GET /admin/dashboard?from&to&departments=64,40
========================= */
const dashboard = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);
    const now = new Date();

    const departments = parseDepartments(req);
    const establishmentIds =
      await getEstablishmentIdsByDepartments(departments);
    const { scopeEstablishmentsMatch, scopeEventsMatch, scopeEvtLookupMatch } =
      buildScope(establishmentIds);

    // ----------------------------
    // 1) KPIs
    // ----------------------------
    const totalEstablishmentsPromise = Establishment.countDocuments({
      ...scopeEstablishmentsMatch,
    });

    /**
     * Active establishments = établissements qui ont au moins 1 event non-draft
     * (ici on scope d'abord sur establishments via zip)
     */
    const activeEstablishmentsPromise = Establishment.aggregate([
      {
        $match: {
          ...scopeEstablishmentsMatch,
          events: { $exists: true, $not: { $size: 0 } },
        },
      },
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
    ])
      .option({ maxTimeMS: 25000 })
      .then((r) => r[0]?.count ?? 0);

    const totalEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      ...scopeEventsMatch,
      startingDate: { $gte: from, $lte: to },
    });

    const upcomingEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      ...scopeEventsMatch,
      endingDate: { $gt: now },
    });

    /**
     * Registrations total (places) sur période
     * => Registration n'a pas le département, donc lookup Event + filtre dept
     */
    const totalRegistrationsPromise = Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) },
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          ...(scopeEvtLookupMatch || {}),
        },
      },
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

    // 2.a) registrationsByDay
    const registrationsByDay = await Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) },
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          ...(scopeEvtLookupMatch || {}),
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
    ]).option({ maxTimeMS: 25000 });

    // 2.b) eventsByMonth
    const eventsByMonth = await Event.aggregate([
      {
        $match: {
          ...nonDraftMatch,
          ...scopeEventsMatch,
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
    ]).option({ maxTimeMS: 25000 });

    // 2.c) eventsByCity (Establishment -> Events)
    const eventsByCity = await Establishment.aggregate([
      {
        $match: {
          ...scopeEstablishmentsMatch,
          events: { $exists: true, $not: { $size: 0 } },
        },
      },
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
    ]).option({ maxTimeMS: 25000 });

    // 2.d) eventsByCategory
    const eventsByCategory = await Event.aggregate([
      {
        $match: {
          ...nonDraftMatch,
          ...scopeEventsMatch,
          startingDate: { $gte: from, $lte: to },
        },
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
    ]).option({ maxTimeMS: 25000 });

    const charts = {
      registrationsByDay,
      eventsByMonth,
      eventsByCity,
      eventsByCategory,
    };

    // ----------------------------
    // 3) Top établissements (par inscriptions)
    // ----------------------------
    const topEstablishments = await Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) },
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          ...(scopeEvtLookupMatch || {}),
        },
      },
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
    ]).option({ maxTimeMS: 25000 });

    // ----------------------------
    // 4) Activité récente (feed)
    // ----------------------------
    const [recentRegs, recentEvents] = await Promise.all([
      Registration.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select("quantity createdAt event")
        .lean(),
      Event.find({ ...nonDraftMatch, ...scopeEventsMatch })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("title createdAt startingDate")
        .lean(),
    ]);

    const recentRegEventIds = recentRegs
      .map((r: any) => r.event)
      .filter((id: any) => mongoose.isValidObjectId(id));

    // On scope aussi les Events des regs, sinon feed "cross-dept"
    const regEvents = await Event.find({
      _id: { $in: recentRegEventIds },
      ...(scopeEventsMatch || {}),
    })
      .select("title organizer.establishment")
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
      ...recentRegs
        .map((r: any) => {
          const evt = regEventMap.get(String(r.event));
          if (!evt) return null; // si filtré par dept, on ignore
          return {
            type: "registration",
            date: r.createdAt,
            label: evt?.title ? `Inscription: ${evt.title}` : "Inscription",
            refId: r._id,
            meta: { quantity: r.quantity ?? 0 },
          };
        })
        .filter(Boolean),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 12);

    return res.status(200).json({
      range: { from, to },
      scope: { departments },
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

/* =========================
   1) SUMMARY
   GET /admin/dashboard/summary?from&to&departments=64,40
========================= */
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

    const departments = parseDepartments(req);
    const establishmentIds =
      await getEstablishmentIdsByDepartments(departments);
    const { scopeEstablishmentsMatch, scopeEventsMatch, scopeEvtLookupMatch } =
      buildScope(establishmentIds);

    // Bornes UTC propres
    const fromUTC = startUTC(from);
    const toUTCExclusive = addDaysUTC(startUTC(to), 1);
    const dateRangeMatch = { $gte: fromUTC, $lt: toUTCExclusive };

    // ----------------------------
    // 1) KPIs
    // ----------------------------
    const totalEstablishmentsPromise = Establishment.countDocuments({
      ...scopeEstablishmentsMatch,
    });

    /**
     * Active establishments:
     * - distinct des establishment ayant au moins 1 event non-draft
     * - puis count côté Establishment (activated)
     */
    const activeEstablishmentsPromise = Event.distinct(
      "organizer.establishment",
      {
        ...nonDraftMatch,
        ...(scopeEventsMatch || {}),
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
      ...scopeEventsMatch,
      startingDate: dateRangeMatch,
    });

    const upcomingEventsPromise = Event.countDocuments({
      ...nonDraftMatch,
      ...scopeEventsMatch,
      endingDate: { $gt: now },
    });

    const totalRegistrationsPromise = Registration.aggregate([
      { $match: { createdAt: dateRangeMatch } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          ...(scopeEvtLookupMatch || {}),
        },
      },
      {
        $group: { _id: null, total: { $sum: { $ifNull: ["$quantity", 0] } } },
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
    const registrationsByDay = await Registration.aggregate([
      { $match: { createdAt: dateRangeMatch } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          ...(scopeEvtLookupMatch || {}),
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
    ]).option({ maxTimeMS: 25000 });

    const eventsByMonthRaw = await Event.aggregate([
      {
        $match: {
          ...nonDraftMatch,
          ...scopeEventsMatch,
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

    return res.status(200).json({
      range: { from: fromUTC, to: addDaysUTC(toUTCExclusive, -1) },
      scope: { departments },
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

/* =========================
   2) DISTRIBUTION
   GET /admin/dashboard/distribution?from&to&departments=64,40
========================= */
const distribution = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    // ✅ accepte departments=64,40,33
    const departmentsRaw = String(req.query.departments || "").trim();
    const departments = departmentsRaw
      ? departmentsRaw
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];

    const hasDeptFilter = departments.length > 0;

    // helper (département via zip)
    const deptMatchStage = hasDeptFilter
      ? [
          {
            $match: {
              $expr: {
                $in: [
                  {
                    $substrCP: [{ $ifNull: ["$est.address.zip", ""] }, 0, 2],
                  },
                  departments,
                ],
              },
            },
          },
        ]
      : [];

    // ----------------------------
    // eventsByCity : Event -> Establishment via organizer.establishment
    // ----------------------------
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
      { $unwind: { path: "$est", preserveNullAndEmptyArrays: false } },

      // ✅ filtre département APRES lookup (car zip est dans est)
      ...deptMatchStage,

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

    // ----------------------------
    // eventsByCategory : pareil -> on doit aussi lookup establishment pour filtrer
    // ----------------------------
    const eventsByCategory = await Event.aggregate([
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
      { $unwind: { path: "$est", preserveNullAndEmptyArrays: false } },

      // ✅ filtre département
      ...deptMatchStage,

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
      filters: { departments },
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

/* =========================
   3) TOP ESTABLISHMENTS
   GET /admin/dashboard/top-establishments?from&to&departments=64,40
========================= */
const topEstablishments = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    const departments = parseDepartments(req);
    const establishmentIds =
      await getEstablishmentIdsByDepartments(departments);
    const { scopeEvtLookupMatch } = buildScope(establishmentIds);

    const top = await Registration.aggregate([
      { $match: { createdAt: { $gte: startOfDay(from), $lte: endOfDay(to) } } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "evt",
        },
      },
      { $unwind: "$evt" },
      {
        $match: {
          "evt.isDraft": { $ne: true },
          "evt.organizer.establishment": { $ne: null },
          ...(scopeEvtLookupMatch || {}),
        },
      },
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
    ]).option({ maxTimeMS: 25000 });

    return res.status(200).json({
      range: { from, to },
      scope: { departments },
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

/* =========================
   4) RECENT ACTIVITY
   GET /admin/dashboard/recent-activity?limit=12&departments=64,40
========================= */
const recentActivity = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 12), 50);

    const departments = parseDepartments(req);
    const establishmentIds =
      await getEstablishmentIdsByDepartments(departments);
    const { scopeEventsMatch } = buildScope(establishmentIds);

    const [recentRegs, recentEvents] = await Promise.all([
      Registration.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("quantity createdAt event")
        .lean(),
      Event.find({ ...nonDraftMatch, ...scopeEventsMatch })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title createdAt startingDate")
        .lean(),
    ]);

    const recentRegEventIds = recentRegs
      .map((r: any) => r.event)
      .filter((id: any) => mongoose.isValidObjectId(id));

    const regEvents = await Event.find({
      _id: { $in: recentRegEventIds },
      ...(scopeEventsMatch || {}),
    })
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
      ...recentRegs
        .map((r: any) => {
          const evt = regEventMap.get(String(r.event));
          if (!evt) return null;
          return {
            type: "registration",
            date: r.createdAt,
            label: evt?.title ? `Inscription: ${evt.title}` : "Inscription",
            refId: r._id,
            meta: { quantity: r.quantity ?? 0 },
          };
        })
        .filter(Boolean),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, limit);

    return res.status(200).json({
      scope: { departments },
      tables: { recentActivity: feed },
    });
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

/* =========================
   CUSTOMERS DASHBOARD
   GET /admin/dashboard/customers?from&to&departments=64,40
   NOTE: filtrage dept possible seulement si Customer.account.zip existe
========================= */
const customersDashboard = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    const departments = parseDepartments(req);
    const zipMatch = zipMatchForDepartments(departments);

    // Si ton modèle Customer n'a pas account.zip => laisse vide (pas de scope)
    const scopeCustomersMatch = zipMatch ? { "account.zip": zipMatch } : {};

    const totalCustomersPromise = Customer.countDocuments({
      ...scopeCustomersMatch,
    });

    const newCustomersPromise = Customer.countDocuments({
      ...scopeCustomersMatch,
      createdAt: { $gte: from, $lte: to },
    });

    const premiumCustomersPromise = Customer.countDocuments({
      ...scopeCustomersMatch,
      premiumStatus: true,
    });

    const activeCustomersPromise = Customer.countDocuments({
      ...scopeCustomersMatch,
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

    const customersByCity = await Customer.aggregate([
      { $match: { ...scopeCustomersMatch } },
      {
        $group: {
          _id: { $ifNull: ["$account.city", "Inconnue"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, city: "$_id", value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]).option({ maxTimeMS: 25000 });

    const engagement = await Customer.aggregate([
      { $match: { ...scopeCustomersMatch } },
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
    ]).option({ maxTimeMS: 25000 });

    const topCustomers = await Customer.aggregate([
      { $match: { ...scopeCustomersMatch } },
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
    ]).option({ maxTimeMS: 25000 });

    return res.status(200).json({
      range: { from, to },
      scope: { departments, scopedByZip: Boolean(zipMatch) },
      kpis: {
        totalCustomers,
        newCustomers,
        premiumCustomers,
        activeCustomers,
        inactiveCustomers,
      },
      charts: { customersByCity },
      engagement: engagement[0] || {
        avgReserved: 0,
        avgAttended: 0,
        avgFavorites: 0,
      },
      tables: { topCustomers },
    });
  } catch (error: any) {
    Retour.error(`Admin customers dashboard error: ${error?.message || error}`);
    return res.status(500).json({
      error: "Failed to load customers dashboard",
      details: error?.message || error,
    });
  }
};

/* =========================
   ADS DASHBOARD
   GET /admin/dashboard/ads?from&to&departments=64,40
   - Si departments fournis: on scope uniquement les ads liées à un event
     dont l'organizer.establishment est dans le scope.
========================= */
const adsDashboard = async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);

    const departments = parseDepartments(req);
    const establishmentIds =
      await getEstablishmentIdsByDepartments(departments);
    const scoped = Boolean(establishmentIds && establishmentIds.length);

    // Helper pipeline: Ad -> Event -> filtre dept
    const adScopeLookupStages = scoped
      ? ([
          {
            $lookup: {
              from: "events",
              localField: "event",
              foreignField: "_id",
              as: "evt",
            },
          },
          { $unwind: { path: "$evt", preserveNullAndEmptyArrays: false } },
          {
            $match: {
              "evt.organizer.establishment": { $in: establishmentIds as any[] },
            },
          },
        ] as any[])
      : ([] as any[]);

    // --------------------------------------------------
    // 1) KPIs
    // --------------------------------------------------
    const totalAdsPromise = scoped
      ? AdModel.aggregate([...adScopeLookupStages, { $count: "total" }]).then(
          (r) => r[0]?.total ?? 0,
        )
      : AdModel.countDocuments({});

    const adsWithEventPromise = scoped
      ? AdModel.aggregate([
          { $match: { event: { $exists: true, $ne: null } } },
          ...adScopeLookupStages,
          { $count: "total" },
        ]).then((r) => r[0]?.total ?? 0)
      : AdModel.countDocuments({ event: { $exists: true, $ne: null } });

    // ✅ TOTAL clics (peu importe la date)
    const totalClicksPromise = scoped
      ? AdModel.aggregate([
          ...adScopeLookupStages,
          { $unwind: "$clics" },
          { $count: "total" },
        ]).then((r) => r[0]?.total ?? 0)
      : AdModel.aggregate([{ $unwind: "$clics" }, { $count: "total" }]).then(
          (r) => r[0]?.total ?? 0,
        );

    // ✅ Clics sur la période
    const periodClicksPromise = scoped
      ? AdModel.aggregate([
          ...adScopeLookupStages,
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
        ]).then((r) => r[0]?.total ?? 0)
      : AdModel.aggregate([
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
      ...(adScopeLookupStages as any[]),
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
    ]).option({ maxTimeMS: 25000 });

    // --------------------------------------------------
    // 3) Clics par source
    // --------------------------------------------------
    const clicksBySource = await AdModel.aggregate([
      ...(adScopeLookupStages as any[]),
      { $unwind: "$clics" },
      {
        $group: {
          _id: { $ifNull: ["$clics.source", "Inconnue"] },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, source: "$_id", value: 1 } },
      { $sort: { value: -1 } },
    ]).option({ maxTimeMS: 25000 });

    // --------------------------------------------------
    // 4) Top publicités
    // --------------------------------------------------
    const topAds = await AdModel.aggregate([
      ...(adScopeLookupStages as any[]),
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
    ]).option({ maxTimeMS: 25000 });

    return res.status(200).json({
      range: { from, to },
      scope: { departments, scopedAdsByEventDept: scoped },
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

/* =========================
   UPDATE / DELETE ADMIN
========================= */
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

/* =========================
   EXPORT
========================= */
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
