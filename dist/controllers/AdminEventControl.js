"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventStatsById = exports.deleteEvent = exports.restoreEvent = exports.draftEvent = exports.publishEvent = exports.getEventById = exports.listEvents = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Event_1 = __importDefault(require("../models/Event"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const isValidId = (id) => mongoose_1.default.isValidObjectId(id);
const pickSort = (sortByRaw, sortDirRaw) => {
    const sortBy = String(sortByRaw || "createdAt");
    const dir = String(sortDirRaw || "desc").toLowerCase() === "asc" ? 1 : -1;
    const allowed = {
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
const parseDepartments = (req) => {
    const raw = String(req.query.departments || "").trim();
    if (!raw)
        return [];
    return raw
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
};
const buildSearchMatch = (q) => {
    const query = q.trim();
    if (!query)
        return null;
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
const buildPublicationMatch = (publication) => {
    if (!publication || publication === "all")
        return null;
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
const buildDateStatusMatch = (dateStatus) => {
    const now = new Date();
    if (!dateStatus || dateStatus === "all")
        return null;
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
const mapToFrontShape = (e) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const clicksCount = Array.isArray(e === null || e === void 0 ? void 0 : e.clics) ? e.clics.length : 0;
    const registrationsCount = Array.isArray(e === null || e === void 0 ? void 0 : e.registrations)
        ? e.registrations.length
        : 0;
    const entriesCount = Array.isArray(e === null || e === void 0 ? void 0 : e.entries) ? e.entries.length : 0;
    let dateStatus = "upcoming";
    const now = new Date();
    if ((e === null || e === void 0 ? void 0 : e.startingDate) && (e === null || e === void 0 ? void 0 : e.endingDate)) {
        const start = new Date(e.startingDate);
        const end = new Date(e.endingDate);
        if (end < now)
            dateStatus = "past";
        else if (start <= now && end >= now)
            dateStatus = "ongoing";
        else if (start > now)
            dateStatus = "upcoming";
    }
    let publicationStatus = "published";
    if (e === null || e === void 0 ? void 0 : e.deletedAt)
        publicationStatus = "deleted";
    else if (e === null || e === void 0 ? void 0 : e.isDraft)
        publicationStatus = "draft";
    return Object.assign(Object.assign({}, e), { clicksCount,
        registrationsCount,
        entriesCount,
        publicationStatus,
        dateStatus, establishmentName: ((_a = e === null || e === void 0 ? void 0 : e.establishmentDoc) === null || _a === void 0 ? void 0 : _a.name) || ((_b = e === null || e === void 0 ? void 0 : e.organizer) === null || _b === void 0 ? void 0 : _b.legalName) || "", establishmentCity: ((_d = (_c = e === null || e === void 0 ? void 0 : e.establishmentDoc) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.city) || "", establishmentEmail: ((_e = e === null || e === void 0 ? void 0 : e.establishmentDoc) === null || _e === void 0 ? void 0 : _e.email) || ((_f = e === null || e === void 0 ? void 0 : e.organizer) === null || _f === void 0 ? void 0 : _f.email) || "", establishmentPhone: ((_g = e === null || e === void 0 ? void 0 : e.establishmentDoc) === null || _g === void 0 ? void 0 : _g.phone) || ((_h = e === null || e === void 0 ? void 0 : e.organizer) === null || _h === void 0 ? void 0 : _h.phone) || "" });
};
const listEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const q = String(req.query.q || "");
        const publication = String(req.query.publication || "all");
        const dateStatus = String(req.query.dateStatus || "all");
        const departments = parseDepartments(req);
        const sort = pickSort(String(req.query.sortBy || ""), String(req.query.sortDir || ""));
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
        const pipeline = [
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
        const agg = yield Event_1.default.aggregate(pipeline).option({ maxTimeMS: 25000 });
        const block = (agg === null || agg === void 0 ? void 0 : agg[0]) || {};
        const rawItems = block.items || [];
        const events = rawItems.map(mapToFrontShape);
        const stats = (_b = (_a = block.stats) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : {
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
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to load events",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.listEvents = listEvents;
const getEventById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const event = yield Event_1.default.findById(id).lean();
        if (!event) {
            return res.status(404).json({ error: "Not found" });
        }
        let establishment = null;
        if ((_a = event === null || event === void 0 ? void 0 : event.organizer) === null || _a === void 0 ? void 0 : _a.establishment) {
            establishment = yield Establishment_1.default.findById(event.organizer.establishment)
                .select("name email phone address legalForm createdAt activated banned")
                .lean();
        }
        return res.status(200).json({
            event: mapToFrontShape(Object.assign(Object.assign({}, event), { establishmentDoc: establishment })),
        });
    }
    catch (e) {
        return res.status(500).json({
            error: "Failed",
            details: (e === null || e === void 0 ? void 0 : e.message) || e,
        });
    }
});
exports.getEventById = getEventById;
const publishEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const updated = yield Event_1.default.findByIdAndUpdate(id, {
            $set: {
                isDraft: false,
                deletedAt: null,
            },
        }, { new: true }).lean();
        if (!updated) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({
            ok: true,
            event: mapToFrontShape(updated),
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to publish event",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.publishEvent = publishEvent;
const draftEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const updated = yield Event_1.default.findByIdAndUpdate(id, {
            $set: {
                isDraft: true,
            },
        }, { new: true }).lean();
        if (!updated) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({
            ok: true,
            event: mapToFrontShape(updated),
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to move event to draft",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.draftEvent = draftEvent;
const restoreEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const updated = yield Event_1.default.findByIdAndUpdate(id, {
            $set: {
                deletedAt: null,
            },
        }, { new: true }).lean();
        if (!updated) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({
            ok: true,
            event: mapToFrontShape(updated),
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to restore event",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.restoreEvent = restoreEvent;
const deleteEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const event = yield Event_1.default.findById(id)
            .select("_id registrations deletedAt")
            .lean();
        if (!event) {
            return res.status(404).json({ error: "Not found" });
        }
        if (event === null || event === void 0 ? void 0 : event.deletedAt) {
            return res.status(409).json({ error: "Event already deleted" });
        }
        const hasRegistrations = Array.isArray(event === null || event === void 0 ? void 0 : event.registrations) &&
            event.registrations.length > 0;
        if (hasRegistrations) {
            return res.status(409).json({
                error: "Cannot delete an event with registrations.",
            });
        }
        yield Event_1.default.updateOne({ _id: id }, {
            $set: {
                deletedAt: new Date(),
                isDraft: false,
            },
        });
        return res.status(200).json({ ok: true });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to delete event",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.deleteEvent = deleteEvent;
const parseDateRange = (req) => {
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    let from = req.query.from ? new Date(String(req.query.from)) : null;
    let to = req.query.to ? new Date(String(req.query.to)) : null;
    if (!from ||
        Number.isNaN(from.getTime()) ||
        !to ||
        Number.isNaN(to.getTime())) {
        to = new Date();
        from = new Date();
        from.setDate(from.getDate() - days);
    }
    to.setHours(23, 59, 59, 999);
    return { from, to, days };
};
const fillMissingDays = (from, to, rows) => {
    const map = new Map(rows.map((r) => [
        r.date,
        {
            date: r.date,
            clicks: Number(r.clicks || 0),
            favorites: Number(r.favorites || 0),
            entries: Number(r.entries || 0),
        },
    ]));
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
const getEventStatsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const { from, to } = parseDateRange(req);
        const event = yield Event_1.default.findById(id)
            .select("_id title startingDate endingDate clics favorieds registrations entries deletedAt")
            .lean();
        if (!event) {
            return res.status(404).json({ error: "Not found" });
        }
        const clicks = Array.isArray(event.clics)
            ? event.clics
            : [];
        const favorieds = Array.isArray(event.favorieds)
            ? event.favorieds
            : [];
        const entries = Array.isArray(event.entries)
            ? event.entries
            : [];
        const byDayMap = new Map();
        for (const c of clicks) {
            if (!(c === null || c === void 0 ? void 0 : c.date))
                continue;
            const d = new Date(c.date);
            if (d < from || d > to)
                continue;
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
            if (!(f === null || f === void 0 ? void 0 : f.date))
                continue;
            const d = new Date(f.date);
            if (d < from || d > to)
                continue;
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
            if (!(e === null || e === void 0 ? void 0 : e.checkedInAt))
                continue;
            const d = new Date(e.checkedInAt);
            if (d < from || d > to)
                continue;
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
            registrations: Array.isArray(event.registrations)
                ? event.registrations.length
                : 0,
            entries: entries.length,
        };
        return res.status(200).json({
            event: {
                _id: event._id,
                title: event.title,
                startingDate: event.startingDate,
                endingDate: event.endingDate,
                deletedAt: event.deletedAt || null,
            },
            range: { from, to },
            totals,
            byDay,
        });
    }
    catch (e) {
        return res.status(500).json({
            error: "Failed to load event stats",
            details: (e === null || e === void 0 ? void 0 : e.message) || e,
        });
    }
});
exports.getEventStatsById = getEventStatsById;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5FdmVudENvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQWRtaW5FdmVudENvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esd0RBQWdDO0FBQ2hDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFJcEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBTS9ELE1BQU0sUUFBUSxHQUFHLENBQ2YsU0FBNkIsRUFDN0IsVUFBOEIsRUFDOUIsRUFBRTtJQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLElBQUksV0FBVyxDQUFDLENBQUM7SUFDaEQsTUFBTSxHQUFHLEdBQ1AsTUFBTSxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFaEUsTUFBTSxPQUFPLEdBQXdCO1FBQ25DLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDN0IsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUNyQixZQUFZLEVBQUUsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ25DLFVBQVUsRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxFQUFFLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUM1QixhQUFhLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsT0FBTyxFQUFFLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRTtLQUMvQixDQUFDO0lBRUYsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FB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