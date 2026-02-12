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
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const mongoose_1 = __importDefault(require("mongoose"));
const Admin_1 = __importDefault(require("../models/Admin"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Event_1 = __importDefault(require("../models/Event"));
const Registration_1 = __importDefault(require("../models/Registration"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Ads_1 = require("../models/Ads");
const createAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, firstname, phoneNumber, password, passwordConfirmed } = req.body;
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
        const existingAdmin = yield Admin_1.default.findOne({ email });
        if (existingAdmin) {
            return res
                .status(409)
                .json({ error: "Un administrateur avec cet email existe déjà." });
        }
        const token = uid2(26);
        const salt = uid2(26);
        const hash = SHA256(password + salt).toString(encBase64);
        const admin = new Admin_1.default({
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
        yield admin.save();
        return res.status(201).json({
            message: "Administrateur créé avec succès.",
            admin: {
                id: admin._id,
                email: admin.email,
                account: admin.account,
            },
        });
    }
    catch (error) {
        console.error("Erreur lors de la création de l'administrateur :", error);
        return res.status(500).json({
            error: "Une erreur est survenue, veuillez réessayer plus tard.",
        });
    }
});
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const dashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const now = new Date();
        const sample = yield Event_1.default.findOne({ isDraft: false })
            .select("isDraft")
            .lean();
        const nonDraftMatch = { isDraft: { $ne: true } };
        const totalEstablishmentsPromise = Establishment_1.default.countDocuments({});
        const activeEstablishmentsPromise = Establishment_1.default.aggregate([
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
        ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0; });
        const totalEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign({}, nonDraftMatch), { startingDate: { $gte: from, $lte: to } }));
        const upcomingEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign({}, nonDraftMatch), { endingDate: { $gt: now } }));
        const totalRegistrationsPromise = Registration_1.default.aggregate([
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
        ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
        const [totalEstablishments, activeEstablishments, totalEvents, upcomingEvents, totalRegistrations,] = yield Promise.all([
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
        const registrationsByDay = yield Registration_1.default.aggregate([
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
        const eventsByMonth = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, nonDraftMatch), { startingDate: { $gte: from, $lte: to } }),
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
        const eventsByCity = yield Establishment_1.default.aggregate([
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
        const eventsByCategory = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, nonDraftMatch), { startingDate: { $gte: from, $lte: to } }),
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
        const topEstablishments = yield Registration_1.default.aggregate([
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
        const [recentRegs, recentEvents] = yield Promise.all([
            Registration_1.default.find({})
                .sort({ createdAt: -1 })
                .limit(8)
                .select("quantity createdAt event")
                .lean(),
            Event_1.default.find(Object.assign({}, nonDraftMatch))
                .sort({ createdAt: -1 })
                .limit(8)
                .select("title createdAt startingDate")
                .lean(),
        ]);
        const recentRegEventIds = recentRegs
            .map((r) => r.event)
            .filter((id) => mongoose_1.default.isValidObjectId(id));
        const regEvents = yield Event_1.default.find({ _id: { $in: recentRegEventIds } })
            .select("title")
            .lean();
        const regEventMap = new Map(regEvents.map((e) => [String(e._id), e]));
        const recentActivity = [
            ...recentEvents.map((e) => ({
                type: "event_published",
                date: e.createdAt,
                label: e.title,
                refId: e._id,
            })),
            ...recentRegs.map((r) => {
                var _a;
                const evt = regEventMap.get(String(r.event));
                return {
                    type: "registration",
                    date: r.createdAt,
                    label: (evt === null || evt === void 0 ? void 0 : evt.title) ? `Inscription: ${evt.title}` : "Inscription",
                    refId: r._id,
                    meta: { quantity: (_a = r.quantity) !== null && _a !== void 0 ? _a : 0 },
                };
            }),
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 12);
        return res.status(200).json({
            range: { from, to },
            kpis,
            charts,
            tables: {
                topEstablishments,
                recentActivity,
            },
        });
    }
    catch (error) {
        Retour_1.default.error(`Admin dashboard error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load admin dashboard",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const nonDraftMatch = { isDraft: { $ne: true } };
const parseRange = (req) => {
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
const startUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUTC = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
const fillMonths = (from, to, data) => {
    var _a;
    const map = new Map(data.map((d) => {
        const key = `${d.month.getUTCFullYear()}-${String(d.month.getUTCMonth() + 1).padStart(2, "0")}`;
        return [key, d.value];
    }));
    const out = [];
    const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    while (cur <= end) {
        const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`;
        out.push({ month: new Date(cur), value: (_a = map.get(key)) !== null && _a !== void 0 ? _a : 0 });
        cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return out;
};
const summary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const now = new Date();
        const fromUTC = startUTC(from);
        const toUTCExclusive = addDaysUTC(startUTC(to), 1);
        const dateRangeMatch = { $gte: fromUTC, $lt: toUTCExclusive };
        const totalEstablishmentsPromise = Establishment_1.default.countDocuments({});
        const activeEstablishmentsPromise = Event_1.default.distinct("organizer.establishment", Object.assign(Object.assign({}, nonDraftMatch), { "organizer.establishment": { $ne: null } })).then((ids) => __awaiter(void 0, void 0, void 0, function* () {
            const validIds = ids
                .map((id) => String(id))
                .filter((id) => mongoose_1.default.isValidObjectId(id))
                .map((id) => new mongoose_1.default.Types.ObjectId(id));
            if (validIds.length === 0)
                return 0;
            return Establishment_1.default.countDocuments({
                _id: { $in: validIds },
                activated: true,
            });
        }));
        const totalEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign({}, nonDraftMatch), { startingDate: dateRangeMatch }));
        const upcomingEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign({}, nonDraftMatch), { endingDate: { $gt: now } }));
        const totalRegistrationsPromise = Registration_1.default.aggregate([
            { $match: { createdAt: dateRangeMatch } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ["$quantity", 0] } },
                },
            },
        ])
            .option({ maxTimeMS: 25000 })
            .then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
        const [totalEstablishments, activeEstablishments, totalEvents, upcomingEvents, totalRegistrations,] = yield Promise.all([
            totalEstablishmentsPromise,
            activeEstablishmentsPromise,
            totalEventsPromise,
            upcomingEventsPromise,
            totalRegistrationsPromise,
        ]);
        const registrationsByDay = yield Registration_1.default.aggregate([
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
        const eventsByMonthRaw = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, nonDraftMatch), { startingDate: dateRangeMatch }),
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
        const eventsByMonth = fillMonths(fromUTC, addDaysUTC(toUTCExclusive, -1), eventsByMonthRaw);
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
    }
    catch (error) {
        Retour_1.default.error(`Admin dashboard summary error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load dashboard summary",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const distribution = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const eventsByCity = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, nonDraftMatch), { startingDate: { $gte: from, $lte: to }, "organizer.establishment": { $ne: null } }),
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
        const eventsByCategory = yield Event_1.default.aggregate([
            { $match: Object.assign(Object.assign({}, nonDraftMatch), { startingDate: { $gte: from, $lte: to } }) },
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
    }
    catch (error) {
        Retour_1.default.error(`Admin dashboard distribution error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load dashboard distribution",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const topEstablishments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const top = yield Registration_1.default.aggregate([
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
        ]);
        return res.status(200).json({
            range: { from, to },
            tables: { topEstablishments: top },
        });
    }
    catch (error) {
        Retour_1.default.error(`Admin dashboard topEstablishments error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load top establishments",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const recentActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = Math.min(Number(req.query.limit || 12), 50);
        const [recentRegs, recentEvents] = yield Promise.all([
            Registration_1.default.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("quantity createdAt event")
                .lean(),
            Event_1.default.find(Object.assign({}, nonDraftMatch))
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("title createdAt startingDate")
                .lean(),
        ]);
        const recentRegEventIds = recentRegs
            .map((r) => r.event)
            .filter((id) => mongoose_1.default.isValidObjectId(id));
        const regEvents = yield Event_1.default.find({ _id: { $in: recentRegEventIds } })
            .select("title")
            .lean();
        const regEventMap = new Map(regEvents.map((e) => [String(e._id), e]));
        const feed = [
            ...recentEvents.map((e) => ({
                type: "event_published",
                date: e.createdAt,
                label: e.title,
                refId: e._id,
            })),
            ...recentRegs.map((r) => {
                var _a, _b;
                return ({
                    type: "registration",
                    date: r.createdAt,
                    label: ((_a = regEventMap.get(String(r.event))) === null || _a === void 0 ? void 0 : _a.title)
                        ? `Inscription: ${regEventMap.get(String(r.event)).title}`
                        : "Inscription",
                    refId: r._id,
                    meta: { quantity: (_b = r.quantity) !== null && _b !== void 0 ? _b : 0 },
                });
            }),
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
        return res.status(200).json({ tables: { recentActivity: feed } });
    }
    catch (error) {
        Retour_1.default.error(`Admin dashboard recentActivity error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load recent activity",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const customersDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const totalCustomersPromise = Customer_1.default.countDocuments({});
        const newCustomersPromise = Customer_1.default.countDocuments({
            createdAt: { $gte: from, $lte: to },
        });
        const premiumCustomersPromise = Customer_1.default.countDocuments({
            premiumStatus: true,
        });
        const activeCustomersPromise = Customer_1.default.countDocuments({
            $or: [
                { eventsReserved: { $exists: true, $not: { $size: 0 } } },
                { eventsAttended: { $exists: true, $not: { $size: 0 } } },
            ],
        });
        const [totalCustomers, newCustomers, premiumCustomers, activeCustomers] = yield Promise.all([
            totalCustomersPromise,
            newCustomersPromise,
            premiumCustomersPromise,
            activeCustomersPromise,
        ]);
        const inactiveCustomers = totalCustomers - activeCustomers;
        const customersByCity = yield Customer_1.default.aggregate([
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
        const engagement = yield Customer_1.default.aggregate([
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
        const topCustomers = yield Customer_1.default.aggregate([
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
    }
    catch (error) {
        Retour_1.default.error(`Admin customers dashboard error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load customers dashboard",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const adsDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const totalAdsPromise = Ads_1.AdModel.countDocuments({});
        const adsWithEventPromise = Ads_1.AdModel.countDocuments({
            event: { $exists: true, $ne: null },
        });
        const totalClicksPromise = Ads_1.AdModel.aggregate([
            { $unwind: "$clics" },
            { $count: "total" },
        ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
        const periodClicksPromise = Ads_1.AdModel.aggregate([
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
        ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
        const [totalAds, adsWithEvent, totalClicks, periodClicks] = yield Promise.all([
            totalAdsPromise,
            adsWithEventPromise,
            totalClicksPromise,
            periodClicksPromise,
        ]);
        const avgClicksPerAd = totalAds > 0 ? Number((totalClicks / totalAds).toFixed(2)) : 0;
        const clicksByDay = yield Ads_1.AdModel.aggregate([
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
        const clicksBySource = yield Ads_1.AdModel.aggregate([
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
        const topAds = yield Ads_1.AdModel.aggregate([
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
    }
    catch (error) {
        Retour_1.default.error(`Admin ads dashboard error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load ads dashboard",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const updateAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const adminId = req.params.adminId;
    return Admin_1.default.findById(adminId).then((admin) => __awaiter(void 0, void 0, void 0, function* () {
        if (!admin) {
            return res.status(404).json({ message: "Not found" });
        }
        else {
            admin.set(req.body);
            return admin
                .save()
                .then((admin) => res.status(201).json({ admin: admin }))
                .catch((error) => res.status(500).json({ error: error.message }));
        }
    }));
});
const deleteAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const adminId = req.params.adminId;
    return Admin_1.default.findByIdAndDelete(adminId)
        .then((admin) => admin
        ? res.status(200).json({ message: "Admin is deleted" })
        : res.status(404).json({ message: "Not found" }))
        .catch((error) => res.status(500).json({ error: error.message }));
});
exports.default = {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQWRtaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0Isd0RBQWdDO0FBR2hDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsNERBQW9DO0FBQ3BDLDBFQUFrRDtBQUNsRCxrRUFBMEM7QUFFMUMsK0RBQXVDO0FBQ3ZDLHVDQUF3QztBQUV4QyxNQUFNLFdBQVcsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUN4RCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxHQUN4RSxHQUFHLENBQUMsSUFBSSxDQUFDO1FBR1gsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQy9ELE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSw4Q0FBOEMsRUFBRSxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUdELElBQUksUUFBUSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDbkMsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLHlDQUF5QyxFQUFFLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBR0QsTUFBTSxVQUFVLEdB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