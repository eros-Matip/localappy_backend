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
const fillMonths = (from, to, data) => {
    var _a;
    const map = new Map(data.map((d) => {
        const key = `${d.month.getFullYear()}-${String(d.month.getMonth() + 1).padStart(2, "0")}`;
        return [key, d.value];
    }));
    const out = [];
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
        out.push({ month: new Date(cur), value: (_a = map.get(key)) !== null && _a !== void 0 ? _a : 0 });
        cur.setMonth(cur.getMonth() + 1);
    }
    return out;
};
const summary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const now = new Date();
        const totalEstablishmentsPromise = Establishment_1.default.countDocuments({});
        const activeEstablishmentsPromise = Event_1.default.aggregate([
            {
                $match: {
                    isDraft: { $ne: true },
                    "organizer.establishment": { $exists: true, $ne: null },
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
            { $unwind: "$est" },
            { $match: { "est.activated": true } },
            {
                $group: {
                    _id: "$organizer.establishment",
                },
            },
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
                $group: { _id: null, total: { $sum: { $ifNull: ["$quantity", 0] } } },
            },
        ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
        const [totalEstablishments, activeEstablishments, totalEvents, upcomingEvents, totalRegistrations,] = yield Promise.all([
            totalEstablishmentsPromise,
            activeEstablishmentsPromise,
            totalEventsPromise,
            upcomingEventsPromise,
            totalRegistrationsPromise,
        ]);
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
        const eventsByMonthRaw = yield Event_1.default.aggregate([
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
                        $dateFromParts: {
                            year: "$_id.y",
                            month: "$_id.m",
                            day: 1,
                        },
                    },
                    value: 1,
                },
            },
            { $sort: { month: 1 } },
        ]);
        const eventsByMonth = fillMonths(from, to, eventsByMonthRaw);
        return res.status(200).json({
            range: { from, to },
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