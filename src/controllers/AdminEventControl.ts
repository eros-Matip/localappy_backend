import { Request, Response } from "express";
import mongoose from "mongoose";
import Event from "../models/Event";
import Establishment from "../models/Establishment";

type SortDir = 1 | -1;

const isValidId = (id: string) => mongoose.isValidObjectId(id);

/* =========================
   SORT
========================= */

const pickSort = (
  sortByRaw: string | undefined,
  sortDirRaw: string | undefined,
) => {
  const sortBy = String(sortByRaw || "createdAt");
  const dir: SortDir =
    String(sortDirRaw || "desc").toLowerCase() === "asc" ? 1 : -1;

  const allowed: Record<string, any> = {
    createdAt: { createdAt: dir },
    title: { title: dir },
    startingDate: { startingDate: dir },
    endingDate: { endingDate: dir },
    clicks: { clicksCount: dir },
    registrations: { registrationsCount: dir },
    entries: { entriesCount: dir },
  };

  return allowed[sortBy] || { createdAt: -1 };
};

/* =========================
   FILTERS
========================= */

const parseDepartments = (req: Request): string[] => {
  const raw = String(req.query.departments || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
};

const buildSearchMatch = (q: string) => {
  const query = q.trim();
  if (!query) return null;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");

  return {
    $or: [
      { title: { $regex: re } },
      { description: { $regex: re } },
      { address: { $regex: re } },
      { theme: { $elemMatch: { $regex: re } } },
      { "organizer.legalName": { $regex: re } },
      { "organizer.email": { $regex: re } },
      { "organizer.phone": { $regex: re } },
    ],
  };
};

const buildPublicationMatch = (publication: string) => {
  // all | published | draft | deleted
  if (!publication || publication === "all") return null;

  if (publication === "published") {
    return {
      isDraft: { $ne: true },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
  }

  if (publication === "draft") {
    return {
      isDraft: true,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
  }

  if (publication === "deleted") {
    return { deletedAt: { $ne: null } };
  }

  return null;
};

const buildDateStatusMatch = (dateStatus: string) => {
  const now = new Date();

  // all | upcoming | ongoing | past
  if (!dateStatus || dateStatus === "all") return null;

  if (dateStatus === "upcoming") {
    return { startingDate: { $gt: now } };
  }

  if (dateStatus === "ongoing") {
    return {
      startingDate: { $lte: now },
      endingDate: { $gte: now },
    };
  }

  if (dateStatus === "past") {
    return { endingDate: { $lt: now } };
  }

  return null;
};

/* =========================
   PROJECTION / MAPPING
========================= */

const projectForFront = () => ({
  title: 1,
  theme: 1,
  startingDate: 1,
  endingDate: 1,
  address: 1,
  location: 1,
  price: 1,
  priceSpecification: 1,
  acceptedPaymentMethod: 1,
  organizer: 1,
  capacity: 1,
  registrationOpen: 1,
  isDraft: 1,
  registrations: 1,
  bills: 1,
  entries: 1,
  image: 1,
  description: 1,
  translations: 1,
  color: 1,
  clics: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: 1,
});

const mapToFrontShape = (e: any) => {
  const clicksCount = Array.isArray(e?.clics) ? e.clics.length : 0;
  const registrationsCount = Array.isArray(e?.registrations)
    ? e.registrations.length
    : 0;
  const entriesCount = Array.isArray(e?.entries) ? e.entries.length : 0;

  let dateStatus = "upcoming";
  const now = new Date();

  if (e?.startingDate && e?.endingDate) {
    const start = new Date(e.startingDate);
    const end = new Date(e.endingDate);

    if (end < now) dateStatus = "past";
    else if (start <= now && end >= now) dateStatus = "ongoing";
    else if (start > now) dateStatus = "upcoming";
  }

  let publicationStatus = "published";
  if (e?.deletedAt) publicationStatus = "deleted";
  else if (e?.isDraft) publicationStatus = "draft";

  return {
    ...e,
    clicksCount,
    registrationsCount,
    entriesCount,
    publicationStatus,
    dateStatus,
    establishmentName:
      e?.establishmentDoc?.name || e?.organizer?.legalName || "",
    establishmentCity: e?.establishmentDoc?.address?.city || "",
    establishmentEmail: e?.establishmentDoc?.email || e?.organizer?.email || "",
    establishmentPhone: e?.establishmentDoc?.phone || e?.organizer?.phone || "",
  };
};

/* =========================
   LIST
   GET /adminEventControl/events?q=&publication=&dateStatus=&departments=
========================= */

export const listEvents = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "");
    const publication = String(req.query.publication || "all");
    const dateStatus = String(req.query.dateStatus || "all");
    const departments = parseDepartments(req);
    const sort = pickSort(
      String(req.query.sortBy || ""),
      String(req.query.sortDir || ""),
    );

    const establishmentMatch = departments.length
      ? {
          $or: [
            { "establishmentDoc.address.department": { $in: departments } },
            {
              "establishmentDoc.address.postalCode": {
                $regex: new RegExp(`^(${departments.join("|")})`),
              },
            },
          ],
        }
      : null;

    const matches = [
      buildSearchMatch(q),
      buildPublicationMatch(publication),
      buildDateStatusMatch(dateStatus),
    ].filter(Boolean);

    const pipeline: any[] = [
      {
        $lookup: {
          from: "establishments",
          localField: "organizer.establishment",
          foreignField: "_id",
          as: "establishmentDoc",
        },
      },
      {
        $unwind: {
          path: "$establishmentDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(establishmentMatch ? [{ $match: establishmentMatch }] : []),
      ...(matches.length ? [{ $match: { $and: matches } }] : []),
      {
        $addFields: {
          clicksCount: { $size: { $ifNull: ["$clics", []] } },
          registrationsCount: { $size: { $ifNull: ["$registrations", []] } },
          entriesCount: { $size: { $ifNull: ["$entries", []] } },
        },
      },
      { $sort: sort },
      {
        $facet: {
          items: [{ $project: projectForFront() }],
          total: [{ $count: "count" }],
          stats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                drafts: {
                  $sum: { $cond: [{ $eq: ["$isDraft", true] }, 1, 0] },
                },
                deleted: {
                  $sum: {
                    $cond: [{ $ne: ["$deletedAt", null] }, 1, 0],
                  },
                },
                published: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$isDraft", true] },
                          { $eq: ["$deletedAt", null] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                upcoming: {
                  $sum: {
                    $cond: [{ $gt: ["$startingDate", new Date()] }, 1, 0],
                  },
                },
                past: {
                  $sum: {
                    $cond: [{ $lt: ["$endingDate", new Date()] }, 1, 0],
                  },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ];

    const agg = await Event.aggregate(pipeline).option({ maxTimeMS: 25000 });
    const block = agg?.[0] || {};

    const rawItems = block.items || [];
    const events = rawItems.map(mapToFrontShape);

    const stats = block.stats?.[0] ?? {
      total: 0,
      drafts: 0,
      deleted: 0,
      published: 0,
      upcoming: 0,
      past: 0,
    };

    return res.status(200).json({
      events,
      stats,
      scope: { departments },
      filters: { q, publication, dateStatus },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to load events",
      details: error?.message || error,
    });
  }
};

/* =========================
   DETAILS
   GET /adminEventControl/events/:id
========================= */

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const event = await Event.findById(id).lean();
    if (!event) {
      return res.status(404).json({ error: "Not found" });
    }

    let establishment = null;

    if ((event as any)?.organizer?.establishment) {
      establishment = await Establishment.findById(
        (event as any).organizer.establishment,
      )
        .select("name email phone address legalForm createdAt activated banned")
        .lean();
    }

    return res.status(200).json({
      event: mapToFrontShape({
        ...event,
        establishmentDoc: establishment,
      }),
    });
  } catch (e: any) {
    return res.status(500).json({
      error: "Failed",
      details: e?.message || e,
    });
  }
};

/* =========================
   ACTIONS
========================= */

export const publishEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      {
        $set: {
          isDraft: false,
          deletedAt: null,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({
      ok: true,
      event: mapToFrontShape(updated),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to publish event",
      details: error?.message || error,
    });
  }
};

export const draftEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      {
        $set: {
          isDraft: true,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({
      ok: true,
      event: mapToFrontShape(updated),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to move event to draft",
      details: error?.message || error,
    });
  }
};

export const restoreEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      {
        $set: {
          deletedAt: null,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({
      ok: true,
      event: mapToFrontShape(updated),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to restore event",
      details: error?.message || error,
    });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const event = await Event.findById(id)
      .select("_id registrations deletedAt")
      .lean();

    if (!event) {
      return res.status(404).json({ error: "Not found" });
    }

    if ((event as any)?.deletedAt) {
      return res.status(409).json({ error: "Event already deleted" });
    }

    const hasRegistrations =
      Array.isArray((event as any)?.registrations) &&
      (event as any).registrations.length > 0;

    if (hasRegistrations) {
      return res.status(409).json({
        error: "Cannot delete an event with registrations.",
      });
    }

    await Event.updateOne(
      { _id: id },
      {
        $set: {
          deletedAt: new Date(),
          isDraft: false,
        },
      },
    );

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to delete event",
      details: error?.message || error,
    });
  }
};

/* =========================
   STATS
   GET /adminEventControl/events/:id/stats
========================= */

const parseDateRange = (req: Request) => {
  const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));

  let from = req.query.from ? new Date(String(req.query.from)) : null;
  let to = req.query.to ? new Date(String(req.query.to)) : null;

  if (
    !from ||
    Number.isNaN(from.getTime()) ||
    !to ||
    Number.isNaN(to.getTime())
  ) {
    to = new Date();
    from = new Date();
    from.setDate(from.getDate() - days);
  }

  to.setHours(23, 59, 59, 999);

  return { from, to, days };
};

const fillMissingDays = (
  from: Date,
  to: Date,
  rows: Array<{
    date: string;
    clicks?: number;
    favorites?: number;
    entries?: number;
  }>,
) => {
  const map = new Map(
    rows.map((r) => [
      r.date,
      {
        date: r.date,
        clicks: Number(r.clicks || 0),
        favorites: Number(r.favorites || 0),
        entries: Number(r.entries || 0),
      },
    ]),
  );

  const cursor = new Date(from);
  const end = new Date(to);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, { date: key, clicks: 0, favorites: 0, entries: 0 });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const getEventStatsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const { from, to } = parseDateRange(req);

    const event = await Event.findById(id)
      .select(
        "_id title startingDate endingDate clics favorieds registrations entries deletedAt",
      )
      .lean();

    if (!event) {
      return res.status(404).json({ error: "Not found" });
    }

    const clicks = Array.isArray((event as any).clics)
      ? (event as any).clics
      : [];
    const favorieds = Array.isArray((event as any).favorieds)
      ? (event as any).favorieds
      : [];
    const entries = Array.isArray((event as any).entries)
      ? (event as any).entries
      : [];

    const byDayMap = new Map<
      string,
      { date: string; clicks: number; favorites: number; entries: number }
    >();

    for (const c of clicks) {
      if (!c?.date) continue;
      const d = new Date(c.date);
      if (d < from || d > to) continue;

      const key = d.toISOString().slice(0, 10);
      const current = byDayMap.get(key) || {
        date: key,
        clicks: 0,
        favorites: 0,
        entries: 0,
      };
      current.clicks += 1;
      byDayMap.set(key, current);
    }

    for (const f of favorieds) {
      if (!f?.date) continue;
      const d = new Date(f.date);
      if (d < from || d > to) continue;

      const key = d.toISOString().slice(0, 10);
      const current = byDayMap.get(key) || {
        date: key,
        clicks: 0,
        favorites: 0,
        entries: 0,
      };
      current.favorites += 1;
      byDayMap.set(key, current);
    }

    for (const e of entries) {
      if (!e?.checkedInAt) continue;
      const d = new Date(e.checkedInAt);
      if (d < from || d > to) continue;

      const key = d.toISOString().slice(0, 10);
      const current = byDayMap.get(key) || {
        date: key,
        clicks: 0,
        favorites: 0,
        entries: 0,
      };
      current.entries += 1;
      byDayMap.set(key, current);
    }

    const byDay = fillMissingDays(from, to, Array.from(byDayMap.values()));

    const totals = {
      clicks: clicks.length,
      favorites: favorieds.length,
      registrations: Array.isArray((event as any).registrations)
        ? (event as any).registrations.length
        : 0,
      entries: entries.length,
    };

    return res.status(200).json({
      event: {
        _id: (event as any)._id,
        title: (event as any).title,
        startingDate: (event as any).startingDate,
        endingDate: (event as any).endingDate,
        deletedAt: (event as any).deletedAt || null,
      },
      range: { from, to },
      totals,
      byDay,
    });
  } catch (e: any) {
    return res.status(500).json({
      error: "Failed to load event stats",
      details: e?.message || e,
    });
  }
};
