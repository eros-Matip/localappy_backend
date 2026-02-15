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
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
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
const parseDepartments = (req) => {
    const raw = String(req.query.departments || "").trim();
    if (!raw)
        return [];
    return raw
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
};
const zipMatchForDepartments = (departments) => {
    if (!departments.length)
        return null;
    const escaped = departments.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`^(${escaped.join("|")})`);
    return { $regex: re };
};
const getEstablishmentIdsByDepartments = (departments) => __awaiter(void 0, void 0, void 0, function* () {
    if (!departments.length)
        return null;
    const zipMatch = zipMatchForDepartments(departments);
    if (!zipMatch)
        return null;
    const ids = yield Establishment_1.default.find({ "address.zip": zipMatch })
        .select("_id")
        .lean();
    return ids.map((x) => x._id);
});
const buildScope = (establishmentIds) => {
    const scopeEstablishmentsMatch = establishmentIds
        ? { _id: { $in: establishmentIds } }
        : {};
    const scopeEventsMatch = establishmentIds
        ? { "organizer.establishment": { $in: establishmentIds } }
        : {};
    const scopeEvtLookupMatch = establishmentIds
        ? { "evt.organizer.establishment": { $in: establishmentIds } }
        : {};
    return { scopeEstablishmentsMatch, scopeEventsMatch, scopeEvtLookupMatch };
};
const nonDraftMatch = { isDraft: { $ne: true } };
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
const dashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to } = parseRange(req);
        const now = new Date();
        const departments = parseDepartments(req);
        const establishmentIds = yield getEstablishmentIdsByDepartments(departments);
        const { scopeEstablishmentsMatch, scopeEventsMatch, scopeEvtLookupMatch } = buildScope(establishmentIds);
        const totalEstablishmentsPromise = Establishment_1.default.countDocuments(Object.assign({}, scopeEstablishmentsMatch));
        const activeEstablishmentsPromise = Establishment_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, scopeEstablishmentsMatch), { events: { $exists: true, $not: { $size: 0 } } }),
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
            .then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0; });
        const totalEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: { $gte: from, $lte: to } }));
        const upcomingEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { endingDate: { $gt: now } }));
        const totalRegistrationsPromise = Registration_1.default.aggregate([
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
                $match: Object.assign({ "evt.isDraft": { $ne: true } }, (scopeEvtLookupMatch || {})),
            },
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
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "evt",
                },
            },
            { $unwind: "$evt" },
            {
                $match: Object.assign({ "evt.isDraft": { $ne: true } }, (scopeEvtLookupMatch || {})),
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
        const eventsByMonth = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: { $gte: from, $lte: to } }),
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
        const eventsByCity = yield Establishment_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, scopeEstablishmentsMatch), { events: { $exists: true, $not: { $size: 0 } } }),
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
        const eventsByCategory = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: { $gte: from, $lte: to } }),
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
        const topEstablishments = yield Registration_1.default.aggregate([
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
                $match: Object.assign({ "evt.isDraft": { $ne: true } }, (scopeEvtLookupMatch || {})),
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
        const [recentRegs, recentEvents] = yield Promise.all([
            Registration_1.default.find({})
                .sort({ createdAt: -1 })
                .limit(8)
                .select("quantity createdAt event")
                .lean(),
            Event_1.default.find(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch))
                .sort({ createdAt: -1 })
                .limit(8)
                .select("title createdAt startingDate")
                .lean(),
        ]);
        const recentRegEventIds = recentRegs
            .map((r) => r.event)
            .filter((id) => mongoose_1.default.isValidObjectId(id));
        const regEvents = yield Event_1.default.find(Object.assign({ _id: { $in: recentRegEventIds } }, (scopeEventsMatch || {})))
            .select("title organizer.establishment")
            .lean();
        const regEventMap = new Map(regEvents.map((e) => [String(e._id), e]));
        const recentActivity = [
            ...recentEvents.map((e) => ({
                type: "event_published",
                date: e.createdAt,
                label: e.title,
                refId: e._id,
            })),
            ...recentRegs
                .map((r) => {
                var _a;
                const evt = regEventMap.get(String(r.event));
                if (!evt)
                    return null;
                return {
                    type: "registration",
                    date: r.createdAt,
                    label: (evt === null || evt === void 0 ? void 0 : evt.title) ? `Inscription: ${evt.title}` : "Inscription",
                    refId: r._id,
                    meta: { quantity: (_a = r.quantity) !== null && _a !== void 0 ? _a : 0 },
                };
            })
                .filter(Boolean),
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
    }
    catch (error) {
        Retour_1.default.error(`Admin dashboard error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to load admin dashboard",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
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
        const departments = parseDepartments(req);
        const establishmentIds = yield getEstablishmentIdsByDepartments(departments);
        const { scopeEstablishmentsMatch, scopeEventsMatch, scopeEvtLookupMatch } = buildScope(establishmentIds);
        const fromUTC = startUTC(from);
        const toUTCExclusive = addDaysUTC(startUTC(to), 1);
        const dateRangeMatch = { $gte: fromUTC, $lt: toUTCExclusive };
        const totalEstablishmentsPromise = Establishment_1.default.countDocuments(Object.assign({}, scopeEstablishmentsMatch));
        const activeEstablishmentsPromise = Event_1.default.distinct("organizer.establishment", Object.assign(Object.assign(Object.assign({}, nonDraftMatch), (scopeEventsMatch || {})), { "organizer.establishment": { $ne: null } })).then((ids) => __awaiter(void 0, void 0, void 0, function* () {
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
        const totalEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: dateRangeMatch }));
        const upcomingEventsPromise = Event_1.default.countDocuments(Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { endingDate: { $gt: now } }));
        const totalRegistrationsPromise = Registration_1.default.aggregate([
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
                $match: Object.assign({ "evt.isDraft": { $ne: true } }, (scopeEvtLookupMatch || {})),
            },
            {
                $group: { _id: null, total: { $sum: { $ifNull: ["$quantity", 0] } } },
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
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "evt",
                },
            },
            { $unwind: "$evt" },
            {
                $match: Object.assign({ "evt.isDraft": { $ne: true } }, (scopeEvtLookupMatch || {})),
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
        const eventsByMonthRaw = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: dateRangeMatch }),
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
        const departments = parseDepartments(req);
        const establishmentIds = yield getEstablishmentIdsByDepartments(departments);
        const { scopeEventsMatch } = buildScope(establishmentIds);
        const eventsByCity = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: { $gte: from, $lte: to }, "organizer.establishment": { $ne: null } }),
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
        ]).option({ maxTimeMS: 25000 });
        const eventsByCategory = yield Event_1.default.aggregate([
            {
                $match: Object.assign(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch), { startingDate: { $gte: from, $lte: to } }),
            },
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
        ]).option({ maxTimeMS: 25000 });
        return res.status(200).json({
            range: { from, to },
            scope: { departments },
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
        const departments = parseDepartments(req);
        const establishmentIds = yield getEstablishmentIdsByDepartments(departments);
        const { scopeEvtLookupMatch } = buildScope(establishmentIds);
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
                $match: Object.assign({ "evt.isDraft": { $ne: true }, "evt.organizer.establishment": { $ne: null } }, (scopeEvtLookupMatch || {})),
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
        const departments = parseDepartments(req);
        const establishmentIds = yield getEstablishmentIdsByDepartments(departments);
        const { scopeEventsMatch } = buildScope(establishmentIds);
        const [recentRegs, recentEvents] = yield Promise.all([
            Registration_1.default.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("quantity createdAt event")
                .lean(),
            Event_1.default.find(Object.assign(Object.assign({}, nonDraftMatch), scopeEventsMatch))
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("title createdAt startingDate")
                .lean(),
        ]);
        const recentRegEventIds = recentRegs
            .map((r) => r.event)
            .filter((id) => mongoose_1.default.isValidObjectId(id));
        const regEvents = yield Event_1.default.find(Object.assign({ _id: { $in: recentRegEventIds } }, (scopeEventsMatch || {})))
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
            ...recentRegs
                .map((r) => {
                var _a;
                const evt = regEventMap.get(String(r.event));
                if (!evt)
                    return null;
                return {
                    type: "registration",
                    date: r.createdAt,
                    label: (evt === null || evt === void 0 ? void 0 : evt.title) ? `Inscription: ${evt.title}` : "Inscription",
                    refId: r._id,
                    meta: { quantity: (_a = r.quantity) !== null && _a !== void 0 ? _a : 0 },
                };
            })
                .filter(Boolean),
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
        return res.status(200).json({
            scope: { departments },
            tables: { recentActivity: feed },
        });
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
        const departments = parseDepartments(req);
        const zipMatch = zipMatchForDepartments(departments);
        const scopeCustomersMatch = zipMatch ? { "account.zip": zipMatch } : {};
        const totalCustomersPromise = Customer_1.default.countDocuments(Object.assign({}, scopeCustomersMatch));
        const newCustomersPromise = Customer_1.default.countDocuments(Object.assign(Object.assign({}, scopeCustomersMatch), { createdAt: { $gte: from, $lte: to } }));
        const premiumCustomersPromise = Customer_1.default.countDocuments(Object.assign(Object.assign({}, scopeCustomersMatch), { premiumStatus: true }));
        const activeCustomersPromise = Customer_1.default.countDocuments(Object.assign(Object.assign({}, scopeCustomersMatch), { $or: [
                { eventsReserved: { $exists: true, $not: { $size: 0 } } },
                { eventsAttended: { $exists: true, $not: { $size: 0 } } },
            ] }));
        const [totalCustomers, newCustomers, premiumCustomers, activeCustomers] = yield Promise.all([
            totalCustomersPromise,
            newCustomersPromise,
            premiumCustomersPromise,
            activeCustomersPromise,
        ]);
        const inactiveCustomers = totalCustomers - activeCustomers;
        const customersByCity = yield Customer_1.default.aggregate([
            { $match: Object.assign({}, scopeCustomersMatch) },
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
        const engagement = yield Customer_1.default.aggregate([
            { $match: Object.assign({}, scopeCustomersMatch) },
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
        const topCustomers = yield Customer_1.default.aggregate([
            { $match: Object.assign({}, scopeCustomersMatch) },
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
        const departments = parseDepartments(req);
        const establishmentIds = yield getEstablishmentIdsByDepartments(departments);
        const scoped = Boolean(establishmentIds && establishmentIds.length);
        const adScopeLookupStages = scoped
            ? [
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
                        "evt.organizer.establishment": { $in: establishmentIds },
                    },
                },
            ]
            : [];
        const totalAdsPromise = scoped
            ? Ads_1.AdModel.aggregate([...adScopeLookupStages, { $count: "total" }]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; })
            : Ads_1.AdModel.countDocuments({});
        const adsWithEventPromise = scoped
            ? Ads_1.AdModel.aggregate([
                { $match: { event: { $exists: true, $ne: null } } },
                ...adScopeLookupStages,
                { $count: "total" },
            ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; })
            : Ads_1.AdModel.countDocuments({ event: { $exists: true, $ne: null } });
        const totalClicksPromise = scoped
            ? Ads_1.AdModel.aggregate([
                ...adScopeLookupStages,
                { $unwind: "$clics" },
                { $count: "total" },
            ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; })
            : Ads_1.AdModel.aggregate([{ $unwind: "$clics" }, { $count: "total" }]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
        const periodClicksPromise = scoped
            ? Ads_1.AdModel.aggregate([
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
            ]).then((r) => { var _a, _b; return (_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; })
            : Ads_1.AdModel.aggregate([
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
            ...adScopeLookupStages,
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
        const clicksBySource = yield Ads_1.AdModel.aggregate([
            ...adScopeLookupStages,
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
        const topAds = yield Ads_1.AdModel.aggregate([
            ...adScopeLookupStages,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQWRtaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0Isd0RBQWdDO0FBR2hDLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsNERBQW9DO0FBQ3BDLDBFQUFrRDtBQUNsRCxrRUFBMEM7QUFFMUMsK0RBQXVDO0FBQ3ZDLHVDQUF3QztBQUt4QyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQU8sRUFBRSxFQUFFLENBQzdCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDdkQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUMzQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUl4RSxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVksRUFBYSxFQUFFO0lBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDdkIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FB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