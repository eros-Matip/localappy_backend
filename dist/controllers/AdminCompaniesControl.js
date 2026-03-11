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
exports.deleteCompany = exports.getCompanyStatsById = exports.disableCompany = exports.activateCompany = exports.unbanCompany = exports.banCompany = exports.validateCompany = exports.getCompanyById = exports.listCompanies = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Owner_1 = __importDefault(require("../models/Owner"));
const Event_1 = __importDefault(require("../models/Event"));
const QrScan_1 = __importDefault(require("../models/QrScan"));
const isValidId = (id) => mongoose_1.default.isValidObjectId(id);
const pickSort = (sortByRaw, sortDirRaw) => {
    const sortBy = String(sortByRaw || "createdAt");
    const dir = String(sortDirRaw || "desc").toLowerCase() === "asc" ? 1 : -1;
    const allowed = {
        createdAt: { createdAt: dir },
        name: { name: dir },
        city: { "address.city": dir },
        activated: { activated: dir },
        banned: { banned: dir },
        legalForm: { legalForm: dir },
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
            { name: { $regex: re } },
            { email: { $regex: re } },
            { phone: { $regex: re } },
            { "address.city": { $regex: re } },
            { "address.street": { $regex: re } },
            { "address.postalCode": { $regex: re } },
            { "legalInfo.siret": { $regex: re } },
            { "legalInfo.rna": { $regex: re } },
            { "legalInfo.activityCodeNAF": { $regex: re } },
            { type: { $elemMatch: { $regex: re } } },
        ],
    };
};
const buildStatusMatch = (status) => {
    if (!status || status === "all")
        return null;
    if (status === "banned")
        return { banned: true };
    if (status === "activated")
        return { activated: true, banned: { $ne: true } };
    if (status === "disabled")
        return { activated: false, banned: { $ne: true } };
    return null;
};
const buildLegalFormMatch = (form) => {
    if (!form || form === "all")
        return null;
    return { legalForm: form };
};
const buildDepartmentsMatch = (departments) => {
    if (!departments.length)
        return null;
    const escaped = departments.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`^(${escaped.join("|")})`);
    return {
        $or: [
            { "address.department": { $in: departments } },
            { "address.postalCode": { $regex: re } },
        ],
    };
};
const projectForFront = () => ({
    name: 1,
    legalForm: 1,
    activated: 1,
    banned: 1,
    createdAt: 1,
    type: 1,
    description: 1,
    address: 1,
    email: 1,
    phone: 1,
    legalInfo: 1,
    owner: 1,
});
const mapToFrontShape = (e) => {
    var _a, _b, _c, _d, _e, _f;
    return (Object.assign(Object.assign({}, e), { city: (_a = e === null || e === void 0 ? void 0 : e.address) === null || _a === void 0 ? void 0 : _a.city, zip: (_b = e === null || e === void 0 ? void 0 : e.address) === null || _b === void 0 ? void 0 : _b.postalCode, adressLabel: (_c = e === null || e === void 0 ? void 0 : e.address) === null || _c === void 0 ? void 0 : _c.street, activity: Array.isArray(e === null || e === void 0 ? void 0 : e.type) && e.type.length ? e.type.join(" • ") : e === null || e === void 0 ? void 0 : e.type, activityCodeNAF: (_d = e === null || e === void 0 ? void 0 : e.legalInfo) === null || _d === void 0 ? void 0 : _d.activityCodeNAF, siret: (_e = e === null || e === void 0 ? void 0 : e.legalInfo) === null || _e === void 0 ? void 0 : _e.siret, rna: (_f = e === null || e === void 0 ? void 0 : e.legalInfo) === null || _f === void 0 ? void 0 : _f.rna, title: e === null || e === void 0 ? void 0 : e.name }));
};
const listCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const q = String(req.query.q || "");
        const form = String(req.query.form || "all");
        const status = String(req.query.status || "all");
        const departments = parseDepartments(req);
        const sort = pickSort(String(req.query.sortBy || ""), String(req.query.sortDir || ""));
        const baseMatch = {
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        };
        const matches = [
            baseMatch,
            buildLegalFormMatch(form),
            buildStatusMatch(status),
            buildDepartmentsMatch(departments),
            buildSearchMatch(q),
        ].filter(Boolean);
        const match = matches.length ? { $and: matches } : {};
        const pipeline = [
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                    items: [
                        { $project: projectForFront() },
                        {
                            $lookup: {
                                from: "owners",
                                localField: "owner",
                                foreignField: "_id",
                                as: "ownerDoc",
                            },
                        },
                        {
                            $unwind: { path: "$ownerDoc", preserveNullAndEmptyArrays: true },
                        },
                        {
                            $addFields: {
                                owner: {
                                    email: "$ownerDoc.email",
                                    account: {
                                        name: "$ownerDoc.account.name",
                                        firstname: "$ownerDoc.account.firstname",
                                    },
                                },
                            },
                        },
                        { $project: { ownerDoc: 0 } },
                    ],
                    total: [{ $count: "count" }],
                    stats: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                activated: {
                                    $sum: { $cond: [{ $eq: ["$activated", true] }, 1, 0] },
                                },
                                banned: {
                                    $sum: { $cond: [{ $eq: ["$banned", true] }, 1, 0] },
                                },
                                associations: {
                                    $sum: {
                                        $cond: [{ $eq: ["$legalForm", "association"] }, 1, 0],
                                    },
                                },
                            },
                        },
                        { $project: { _id: 0 } },
                    ],
                },
            },
        ];
        const agg = yield Establishment_1.default.aggregate(pipeline).option({
            maxTimeMS: 25000,
        });
        const block = (agg === null || agg === void 0 ? void 0 : agg[0]) || {};
        const rawItems = block.items || [];
        const companies = rawItems.map(mapToFrontShape);
        const total = (_c = (_b = (_a = block.total) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.count) !== null && _c !== void 0 ? _c : 0;
        const stats = (_e = (_d = block.stats) === null || _d === void 0 ? void 0 : _d[0]) !== null && _e !== void 0 ? _e : {
            total: 0,
            activated: 0,
            banned: 0,
            associations: 0,
        };
        return res.status(200).json({
            companies,
            stats,
            scope: { departments },
            filters: { q, form, status },
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Failed to load companies",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.listCompanies = listCompanies;
const getCompanyById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const company = yield Establishment_1.default.findById(id)
            .populate({
            path: "owner",
            model: Owner_1.default,
            select: "email account picture cni isValidated isVerified createdAt",
        })
            .lean();
        if (!company)
            return res.status(404).json({ error: "Not found" });
        return res.status(200).json({ company: mapToFrontShape(company) });
    }
    catch (e) {
        return res.status(500).json({ error: "Failed", details: (e === null || e === void 0 ? void 0 : e.message) || e });
    }
});
exports.getCompanyById = getCompanyById;
const validateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const { accepted, reason } = req.body;
        if (typeof accepted !== "boolean") {
            return res.status(400).json({ error: "accepted (boolean) is required" });
        }
        const patch = accepted
            ? { activated: true, banned: false }
            : { activated: false, banned: true };
        const updated = yield Establishment_1.default.findByIdAndUpdate(id, patch, {
            new: true,
        })
            .populate({
            path: "owner",
            model: Owner_1.default,
            select: "email account.name account.firstname picture cni isValidated isVerified",
        })
            .lean();
        if (!updated)
            return res.status(404).json({ error: "Not found" });
        return res.status(200).json({
            ok: true,
            company: mapToFrontShape(updated),
            reason: reason || "",
        });
    }
    catch (e) {
        return res.status(500).json({ error: "Failed", details: (e === null || e === void 0 ? void 0 : e.message) || e });
    }
});
exports.validateCompany = validateCompany;
function updateById(id, patch) {
    return __awaiter(this, void 0, void 0, function* () {
        return Establishment_1.default.findByIdAndUpdate(id, patch, { new: true })
            .populate({
            path: "owner",
            model: Owner_1.default,
            select: "email account.name account.firstname",
        })
            .lean();
    });
}
const banCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const updated = yield updateById(id, { banned: true, activated: false });
        if (!updated)
            return res.status(404).json({ error: "Not found" });
        return res
            .status(200)
            .json({ ok: true, company: mapToFrontShape(updated) });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to ban", details: (error === null || error === void 0 ? void 0 : error.message) || error });
    }
});
exports.banCompany = banCompany;
const unbanCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const updated = yield updateById(id, { banned: false });
        if (!updated)
            return res.status(404).json({ error: "Not found" });
        return res
            .status(200)
            .json({ ok: true, company: mapToFrontShape(updated) });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to unban", details: (error === null || error === void 0 ? void 0 : error.message) || error });
    }
});
exports.unbanCompany = unbanCompany;
const activateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const current = yield Establishment_1.default.findById(id)
            .select("banned activated")
            .lean();
        if (!current)
            return res.status(404).json({ error: "Not found" });
        if (current === null || current === void 0 ? void 0 : current.banned) {
            return res.status(409).json({ error: "Company is banned. Unban first." });
        }
        const updated = yield updateById(id, { activated: true });
        return res
            .status(200)
            .json({ ok: true, company: mapToFrontShape(updated) });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to activate", details: (error === null || error === void 0 ? void 0 : error.message) || error });
    }
});
exports.activateCompany = activateCompany;
const disableCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const updated = yield updateById(id, { activated: false });
        if (!updated)
            return res.status(404).json({ error: "Not found" });
        return res
            .status(200)
            .json({ ok: true, company: mapToFrontShape(updated) });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to disable", details: (error === null || error === void 0 ? void 0 : error.message) || error });
    }
});
exports.disableCompany = disableCompany;
const parseDateRange = (req) => {
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    const timezone = String(req.query.timezone || "Europe/Paris");
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
    return { from, to, days, timezone };
};
const fillMissingDays = (from, to, rows) => {
    const map = new Map(rows.map((r) => [
        r.date,
        {
            date: r.date,
            qrScans: Number(r.qrScans || 0),
            eventViews: Number(r.eventViews || 0),
        },
    ]));
    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        if (!map.has(key)) {
            map.set(key, { date: key, qrScans: 0, eventViews: 0 });
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};
const getCompanyStatsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const { from, to, timezone } = parseDateRange(req);
        const company = yield Establishment_1.default.findById(id)
            .select("_id name legalForm events createdAt")
            .lean();
        if (!company) {
            return res.status(404).json({ error: "Not found" });
        }
        const establishmentObjectId = new mongoose_1.default.Types.ObjectId(id);
        const qrByDay = yield QrScan_1.default.aggregate([
            {
                $match: {
                    establishment: establishmentObjectId,
                    scannedAt: { $gte: from, $lte: to },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$scannedAt",
                            timezone,
                        },
                    },
                    qrScans: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    qrScans: 1,
                },
            },
        ]);
        const eventViewsByDay = yield Event_1.default.aggregate([
            {
                $match: {
                    _id: {
                        $in: Array.isArray(company.events)
                            ? company.events
                            : [],
                    },
                },
            },
            { $unwind: "$clics" },
            {
                $match: {
                    $and: [
                        {
                            $or: [
                                { "clics.source": "event-view" },
                                { "clics.source": "view" },
                                { "clics.source": "consultation" },
                                { "clics.type": "view" },
                            ],
                        },
                        {
                            $or: [
                                { "clics.createdAt": { $gte: from, $lte: to } },
                                { "clics.date": { $gte: from, $lte: to } },
                            ],
                        },
                    ],
                },
            },
            {
                $addFields: {
                    clicDate: {
                        $ifNull: ["$clics.createdAt", "$clics.date"],
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$clicDate",
                            timezone,
                        },
                    },
                    eventViews: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    eventViews: 1,
                },
            },
        ]);
        const viewsByEvent = yield Event_1.default.aggregate([
            {
                $match: {
                    _id: {
                        $in: Array.isArray(company.events)
                            ? company.events
                            : [],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    startingDate: 1,
                    clics: 1,
                },
            },
            { $unwind: { path: "$clics", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    $and: [
                        {
                            $or: [
                                { "clics.source": "event-view" },
                                { "clics.source": "view" },
                                { "clics.source": "consultation" },
                                { "clics.type": "view" },
                            ],
                        },
                        {
                            $or: [
                                { "clics.createdAt": { $gte: from, $lte: to } },
                                { "clics.date": { $gte: from, $lte: to } },
                            ],
                        },
                    ],
                },
            },
            {
                $group: {
                    _id: "$_id",
                    title: { $first: "$title" },
                    startingDate: { $first: "$startingDate" },
                    views: { $sum: 1 },
                },
            },
            { $sort: { views: -1, startingDate: 1 } },
            {
                $project: {
                    _id: 0,
                    eventId: "$_id",
                    title: 1,
                    startingDate: 1,
                    views: 1,
                },
            },
        ]);
        const mergedMap = new Map();
        for (const row of qrByDay) {
            mergedMap.set(row.date, {
                date: row.date,
                qrScans: Number(row.qrScans || 0),
                eventViews: 0,
            });
        }
        for (const row of eventViewsByDay) {
            const existing = mergedMap.get(row.date);
            if (existing) {
                existing.eventViews = Number(row.eventViews || 0);
            }
            else {
                mergedMap.set(row.date, {
                    date: row.date,
                    qrScans: 0,
                    eventViews: Number(row.eventViews || 0),
                });
            }
        }
        const byDay = fillMissingDays(from, to, Array.from(mergedMap.values()));
        const totals = {
            qrScans: byDay.reduce((sum, r) => sum + Number(r.qrScans || 0), 0),
            eventViews: byDay.reduce((sum, r) => sum + Number(r.eventViews || 0), 0),
            eventsCount: Array.isArray(company.events)
                ? company.events.length
                : 0,
        };
        return res.status(200).json({
            company: {
                _id: company._id,
                name: company.name,
                legalForm: company.legalForm,
            },
            range: {
                from,
                to,
                timezone,
            },
            totals,
            byDay,
            byEvent: viewsByEvent,
        });
    }
    catch (e) {
        return res.status(500).json({
            error: "Failed to load company stats",
            details: (e === null || e === void 0 ? void 0 : e.message) || e,
        });
    }
});
exports.getCompanyStatsById = getCompanyStatsById;
const deleteCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidId(id))
            return res.status(400).json({ error: "Invalid id" });
        const est = yield Establishment_1.default.findById(id)
            .select("_id owner events")
            .lean();
        if (!est)
            return res.status(404).json({ error: "Not found" });
        const hasEvents = Array.isArray(est === null || est === void 0 ? void 0 : est.events) && est.events.length > 0;
        if (hasEvents) {
            return res.status(409).json({
                error: "Cannot delete an establishment with events. Disable it or remove events first.",
            });
        }
        yield Establishment_1.default.updateOne({ _id: id }, { $set: { deletedAt: new Date(), activated: false } });
        if ((est === null || est === void 0 ? void 0 : est.owner) && isValidId(String(est.owner))) {
            yield Owner_1.default.updateOne({ _id: est.owner }, { $pull: { establishments: est._id } });
        }
        return res.status(200).json({ ok: true });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to delete", details: (error === null || error === void 0 ? void 0 : error.message) || error });
    }
});
exports.deleteCompany = deleteCompany;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Db21wYW5pZXNDb250cm9sLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL0FkbWluQ29tcGFuaWVzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsNEVBQW9EO0FBQ3BELDREQUFvQztBQUNwQyw0REFBb0M7QUFDcEMsOERBQXNDO0FBSXRDLE1BQU0sU0FBUyxHQUFRLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQU1wRSxNQUFNLFFBQVEsR0FBRyxDQUNmLFNBQTZCLEVBQzdCLFVBQThCLEVBQzlCLEVBQUU7SUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxJQUFJLFdBQVcsQ0FBQyxDQUFDO0lBQ2hELE1BQU0sR0FBRyxHQUNQLE1BQU0sQ0FBQyxVQUFVLElBQUksTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBR2hFLE1BQU0sT0FBTyxHQUF3QjtRQUNuQyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQzdCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDbkIsSUFBSSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUM3QixTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDdkIsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRTtLQUM5QixDQUFDO0lBRUYsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM5QyxDQUFDLENBQUM7QUFNRixNQUFNLGdCQUFnQixHQUFHLENBQUMsR0FBWSxFQUFZLEVBQUU7SUFDbEQsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZELElBQUksQ0FBQyxHQUFHO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFDcEIsT0FBTyxHQUFHO1NBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQztTQUNWLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUU7SUFDckMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZCLElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFHeEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3RCxNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFHcEMsT0FBTztRQUNMLEdBQUcsRUFBRTtZQUNILEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3hCLEVBQUUsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3pCLEVBQUUsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3pCLEVBQUUsY0FBYyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ2xDLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDcEMsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUN4QyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3JDLEVBQUUsZUFBZSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ25DLEVBQUUsMkJBQTJCLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFFL0MsRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtTQUN6QztLQUNGLENBQUM7QUFDSixDQUFDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsTUFBYyxFQUFFLEVBQUU7SUFFMUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLEtBQUssS0FBSztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRTdDLElBQUksTUFBTSxLQUFLLFFBQVE7UUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO0lBR2pELElBQUksTUFBTSxLQUFLLFdBQVc7UUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztJQUU5RSxJQUFJLE1BQU0sS0FBSyxVQUFVO1FBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7SUFFOUUsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUM7QUFFRixNQUFNLG1CQUFtQixHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFFM0MsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssS0FBSztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ3pDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDN0IsQ0FBQyxDQUFDO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFdBQXFCLEVBQUUsRUFBRTtJQUl0RCxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU07UUFBRSxPQUFPLElBQUksQ0FBQztJQUVyQyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDcEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FDekMsQ0FBQztJQUNGLE1BQU0sRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFakQsT0FBTztRQUNMLEdBQUcsRUFBRTtZQUNILEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDOUMsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTtTQUN6QztLQUNGLENBQUM7QUFDSixDQUFDLENBQUM7QUFNRixNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBRTdCLElBQUksRUFBRSxDQUFDO0lBQ1AsU0FBUyxFQUFFLENBQUM7SUFDWixTQUFTLEVBQUUsQ0FBQztJQUNaLE1BQU0sRUFBRSxDQUFDO0lBQ1QsU0FBUyxFQUFFLENBQUM7SUFFWixJQUFJLEVBQUUsQ0FBQztJQUNQLFdBQVcsRUFBRSxDQUFDO0lBRWQsT0FBTyxFQUFFLENBQUM7SUFDVixLQUFLLEVBQUUsQ0FBQztJQUNSLEtBQUssRUFBRSxDQUFDO0lBRVIsU0FBUyxFQUFFLENBQUM7SUFDWixLQUFLLEVBQUUsQ0FBQztDQUNULENBQUMsQ0FBQztBQUVILE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBTSxFQUFFLEVBQUU7O0lBQUMsT0FBQSxpQ0FDL0IsQ0FBQyxLQUVKLElBQUksRUFBRSxNQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxPQUFPLDBDQUFFLElBQUksRUFDdEIsR0FBRyxFQUFFLE1BQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLE9BQU8sMENBQUUsVUFBVSxFQUUzQixXQUFXLEVBQUUsTUFBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTywwQ0FBRSxNQUFNLEVBRS9CLFFBQVEsRUFDTixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxJQUFJLEVBQ3hFLGVBQWUsRUFBRSxNQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxTQUFTLDBDQUFFLGVBQWUsRUFDOUMsS0FBSyxFQUFFLE1BQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLFNBQVMsMENBQUUsS0FBSyxFQUMxQixHQUFHLEVBQUUsTUFBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsU0FBUywwQ0FBRSxHQUFHLEVBRXRCLEtBQUssRUFBRSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsSUFBSSxJQUNkLENBQUE7Q0FBQSxDQUFDO0FBT0ksTUFBTSxhQUFhLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQ2pFLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNwQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUM7UUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBSWpELE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FDbkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxFQUM5QixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQ2hDLENBQUM7UUFHRixNQUFNLFNBQVMsR0FBUTtZQUNyQixHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1NBQzlELENBQUM7UUFFRixNQUFNLE9BQU8sR0FBRztZQUNkLFNBQVM7WUFDVCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7WUFDekIsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1lBQ3hCLHFCQUFxQixDQUFDLFdBQVcsQ0FBQztZQUNsQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7U0FDcEIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUV0RCxNQUFNLFFBQVEsR0FBVTtZQUN0QixFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7WUFDakIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1lBQ2Y7Z0JBQ0UsTUFBTSxFQUFFO29CQUNOLEtBQUssRUFBRTt3QkFDTCxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsRUFBRTt3QkFDL0I7NEJBQ0UsT0FBTyxFQUFFO2dDQUNQLElBQUksRUFBRSxRQUFRO2dDQUNkLFVBQVUsRUFBRSxPQUFPO2dDQUNuQixZQUFZLEVBQUUsS0FBSztnQ0FDbkIsRUFBRSxFQUFFLFVBQVU7NkJBQ2Y7eUJBQ0Y7d0JBQ0Q7NEJBQ0UsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUU7eUJBQ2pFO3dCQUNEOzRCQUNFLFVBQVUsRUFBRTtnQ0FDVixLQUFLLEVBQUU7b0NBQ0wsS0FBSyxFQUFFLGlCQUFpQjtvQ0FDeEIsT0FBTyxFQUFFO3dDQUNQLElBQUksRUFBRSx3QkFBd0I7d0NBQzlCLFNBQVMsRUFBRSw2QkFBNkI7cUNBQ3pDO2lDQUNGOzZCQUNGO3lCQUNGO3dCQUNELEVBQUUsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFO3FCQUM5QjtvQkFDRCxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDNUIsS0FBSyxFQUFFO3dCQUNMOzRCQUNFLE1BQU0sRUFBRTtnQ0FDTixHQUFHLEVBQUUsSUFBSTtnQ0FDVCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO2dDQUVsQixTQUFTLEVBQUU7b0NBQ1QsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7aUNBQ3ZEO2dDQUNELE1BQU0sRUFBRTtvQ0FDTixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtpQ0FDcEQ7Z0NBQ0QsWUFBWSxFQUFFO29DQUNaLElBQUksRUFBRTt3Q0FDSixLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUNBQ3REO2lDQUNGOzZCQUNGO3lCQUNGO3dCQUNELEVBQUUsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO3FCQUN6QjtpQkFDRjthQUNGO1NBQ0YsQ0FBQztRQUVGLE1BQU0sR0FBRyxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQ3pELFNBQVMsRUFBRSxLQUFLO1NBQ2pCLENBQUMsQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFHLENBQUMsQ0FBQyxLQUFJLEVBQUUsQ0FBQztRQUU3QixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNuQyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sS0FBSyxHQUFHLE1BQUEsTUFBQSxNQUFBLEtBQUssQ0FBQyxLQUFLLDBDQUFHLENBQUMsQ0FBQywwQ0FBRSxLQUFLLG1DQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxNQUFBLE1BQUEsS0FBSyxDQUFDLEtBQUssMENBQUcsQ0FBQyxDQUFDLG1DQUFJO1lBQ2hDLEtBQUssRUFBRSxDQUFDO1lBQ1IsU0FBUyxFQUFFLENBQUM7WUFDWixNQUFNLEVBQUUsQ0FBQztZQUNULFlBQVksRUFBRSxDQUFDO1NBQ2hCLENBQUM7UUFFRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLFNBQVM7WUFDVCxLQUFLO1lBQ0wsS0FBSyxFQUFFLEVBQUUsV0FBVyxFQUFFO1lBQ3RCLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1NBQzdCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsS0FBSyxFQUFFLDBCQUEwQjtZQUNqQyxPQUFPLEVBQUUsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUs7U0FDakMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBbEhXLFFBQUEsYUFBYSxpQkFrSHhCO0FBT0ssTUFBTSxjQUFjLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDbEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFekUsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7YUFDN0MsUUFBUSxDQUFDO1lBQ1IsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUUsZUFBSztZQUVaLE1BQU0sRUFBRSw0REFBNEQ7U0FDckUsQ0FBQzthQUNELElBQUksRUFBRSxDQUFDO1FBRVYsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFbEUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1FBQ2hCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxPQUFPLEtBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3RSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFwQlcsUUFBQSxjQUFjLGtCQW9CekI7QUFRSyxNQUFNLGVBQWUsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNuRSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUV6RSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUdoQyxDQUFDO1FBRUYsSUFBSSxPQUFPLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGdDQUFnQyxFQUFFLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBS0QsTUFBTSxLQUFLLEdBQVEsUUFBUTtZQUN6QixDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7WUFDcEMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFLdkMsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUU7WUFDL0QsR0FBRyxFQUFFLElBQUk7U0FDVixDQUFDO2FBQ0MsUUFBUSxDQUFDO1lBQ1IsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUUsZUFBSztZQUNaLE1BQU0sRUFDSix5RUFBeUU7U0FDNUUsQ0FBQzthQUNELElBQUksRUFBRSxDQUFDO1FBRVYsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFbEUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxNQUFNLElBQUksRUFBRTtTQUNyQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztRQUNoQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxLQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN0UsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBN0NXLFFBQUEsZUFBZSxtQkE2QzFCO0FBTUYsU0FBZSxVQUFVLENBQUMsRUFBVSxFQUFFLEtBQVU7O1FBQzlDLE9BQU8sdUJBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDO2FBQzdELFFBQVEsQ0FBQztZQUNSLElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFLGVBQUs7WUFDWixNQUFNLEVBQUUsc0NBQXNDO1NBQy9DLENBQUM7YUFDRCxJQUFJLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FBQTtBQUVNLE1BQU0sVUFBVSxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQzlELElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFbEUsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQWhCVyxRQUFBLFVBQVUsY0FnQnJCO0FBRUssTUFBTSxZQUFZLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDaEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFekUsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFbEUsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDMUUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBaEJXLFFBQUEsWUFBWSxnQkFnQnZCO0FBRUssTUFBTSxlQUFlLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDbkUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFekUsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7YUFDN0MsTUFBTSxDQUFDLGtCQUFrQixDQUFDO2FBQzFCLElBQUksRUFBRSxDQUFDO1FBQ1YsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFbEUsSUFBSyxPQUFlLGFBQWYsT0FBTyx1QkFBUCxPQUFPLENBQVUsTUFBTSxFQUFFLENBQUM7WUFDN0IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzFELE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzdFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQXZCVyxRQUFBLGVBQWUsbUJBdUIxQjtBQUVLLE1BQU0sY0FBYyxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ2xFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRWxFLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sS0FBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQWhCVyxRQUFBLGNBQWMsa0JBZ0J6QjtBQUVGLE1BQU0sY0FBYyxHQUFHLENBQUMsR0FBWSxFQUFFLEVBQUU7SUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksY0FBYyxDQUFDLENBQUM7SUFFOUQsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNwRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRTlELElBQ0UsQ0FBQyxJQUFJO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsQ0FBQyxFQUFFO1FBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsRUFDMUIsQ0FBQztRQUNELEVBQUUsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2hCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRTdCLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUN0QyxDQUFDLENBQUM7QUFFRixNQUFNLGVBQWUsR0FBRyxDQUN0QixJQUFVLEVBQ1YsRUFBUSxFQUNSLElBQW9FLEVBQ3BFLEVBQUU7SUFDRixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsSUFBSTtRQUNOO1lBQ0UsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO1lBQ1osT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQztZQUMvQixVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDO1NBQ3RDO0tBQ0YsQ0FBQyxDQUNILENBQUM7SUFFRixNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUV6QixPQUFPLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNyQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUMsQ0FBQztBQUtLLE1BQU0sbUJBQW1CLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDdkUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sT0FBTyxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2FBQzdDLE1BQU0sQ0FBQyxxQ0FBcUMsQ0FBQzthQUM3QyxJQUFJLEVBQUUsQ0FBQztRQUVWLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGtCQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUs5RCxNQUFNLE9BQU8sR0FBRyxNQUFNLGdCQUFNLENBQUMsU0FBUyxDQUFDO1lBQ3JDO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixhQUFhLEVBQUUscUJBQXFCO29CQUNwQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7aUJBQ3BDO2FBQ0Y7WUFDRDtnQkFDRSxNQUFNLEVBQUU7b0JBQ04sR0FBRyxFQUFFO3dCQUNILGFBQWEsRUFBRTs0QkFDYixNQUFNLEVBQUUsVUFBVTs0QkFDbEIsSUFBSSxFQUFFLFlBQVk7NEJBQ2xCLFFBQVE7eUJBQ1Q7cUJBQ0Y7b0JBQ0QsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRTtpQkFDckI7YUFDRjtZQUNELEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3JCO2dCQUNFLFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsQ0FBQztvQkFDTixJQUFJLEVBQUUsTUFBTTtvQkFDWixPQUFPLEVBQUUsQ0FBQztpQkFDWDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBWUgsTUFBTSxlQUFlLEdBQUcsTUFBTSxlQUFLLENBQUMsU0FBUyxDQUFDO1lBQzVDO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixHQUFHLEVBQUU7d0JBQ0gsR0FBRyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUUsT0FBZSxDQUFDLE1BQU0sQ0FBQzs0QkFDekMsQ0FBQyxDQUFFLE9BQWUsQ0FBQyxNQUFNOzRCQUN6QixDQUFDLENBQUMsRUFBRTtxQkFDUDtpQkFDRjthQUNGO1lBQ0QsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFO1lBQ3JCO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixJQUFJLEVBQUU7d0JBQ0o7NEJBQ0UsR0FBRyxFQUFFO2dDQUNILEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRTtnQ0FDaEMsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFO2dDQUMxQixFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUU7Z0NBQ2xDLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRTs2QkFDekI7eUJBQ0Y7d0JBQ0Q7NEJBQ0UsR0FBRyxFQUFFO2dDQUNILEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRTtnQ0FDL0MsRUFBRSxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRTs2QkFDM0M7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtZQUNEO2dCQUNFLFVBQVUsRUFBRTtvQkFDVixRQUFRLEVBQUU7d0JBQ1IsT0FBTyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDO3FCQUM3QztpQkFDRjthQUNGO1lBQ0Q7Z0JBQ0UsTUFBTSxFQUFFO29CQUNOLEdBQUcsRUFBRTt3QkFDSCxhQUFhLEVBQUU7NEJBQ2IsTUFBTSxFQUFFLFVBQVU7NEJBQ2xCLElBQUksRUFBRSxXQUFXOzRCQUNqQixRQUFRO3lCQUNUO3FCQUNGO29CQUNELFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUU7aUJBQ3hCO2FBQ0Y7WUFDRCxFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNyQjtnQkFDRSxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLENBQUM7b0JBQ04sSUFBSSxFQUFFLE1BQU07b0JBQ1osVUFBVSxFQUFFLENBQUM7aUJBQ2Q7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUtILE1BQU0sWUFBWSxHQUFHLE1BQU0sZUFBSyxDQUFDLFNBQVMsQ0FBQztZQUN6QztnQkFDRSxNQUFNLEVBQUU7b0JBQ04sR0FBRyxFQUFFO3dCQUNILEdBQUcsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFFLE9BQWUsQ0FBQyxNQUFNLENBQUM7NEJBQ3pDLENBQUMsQ0FBRSxPQUFlLENBQUMsTUFBTTs0QkFDekIsQ0FBQyxDQUFDLEVBQUU7cUJBQ1A7aUJBQ0Y7YUFDRjtZQUNEO2dCQUNFLFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsQ0FBQztvQkFDTixLQUFLLEVBQUUsQ0FBQztvQkFDUixZQUFZLEVBQUUsQ0FBQztvQkFDZixLQUFLLEVBQUUsQ0FBQztpQkFDVDthQUNGO1lBQ0QsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixFQUFFLElBQUksRUFBRSxFQUFFO1lBQ2pFO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixJQUFJLEVBQUU7d0JBQ0o7NEJBQ0UsR0FBRyxFQUFFO2dDQUNILEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRTtnQ0FDaEMsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFO2dDQUMxQixFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUU7Z0NBQ2xDLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRTs2QkFDekI7eUJBQ0Y7d0JBQ0Q7NEJBQ0UsR0FBRyxFQUFFO2dDQUNILEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRTtnQ0FDL0MsRUFBRSxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRTs2QkFDM0M7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtZQUNEO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixHQUFHLEVBQUUsTUFBTTtvQkFDWCxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO29CQUMzQixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFO29CQUN6QyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO2lCQUNuQjthQUNGO1lBQ0QsRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3pDO2dCQUNFLFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsQ0FBQztvQkFDTixPQUFPLEVBQUUsTUFBTTtvQkFDZixLQUFLLEVBQUUsQ0FBQztvQkFDUixZQUFZLEVBQUUsQ0FBQztvQkFDZixLQUFLLEVBQUUsQ0FBQztpQkFDVDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBS0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBR3RCLENBQUM7UUFFSixLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzFCLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtnQkFDdEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2dCQUNkLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUM7Z0JBQ2pDLFVBQVUsRUFBRSxDQUFDO2FBQ2QsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELEtBQUssTUFBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDYixRQUFRLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUM7aUJBQU0sQ0FBQztnQkFDTixTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3RCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtvQkFDZCxPQUFPLEVBQUUsQ0FBQztvQkFDVixVQUFVLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDO2lCQUN4QyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4RSxNQUFNLE1BQU0sR0FBRztZQUNiLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsRSxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEUsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUUsT0FBZSxDQUFDLE1BQU0sQ0FBQztnQkFDakQsQ0FBQyxDQUFFLE9BQWUsQ0FBQyxNQUFNLENBQUMsTUFBTTtnQkFDaEMsQ0FBQyxDQUFDLENBQUM7U0FDTixDQUFDO1FBRUYsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUU7Z0JBQ1AsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO2dCQUNoQixJQUFJLEVBQUcsT0FBZSxDQUFDLElBQUk7Z0JBQzNCLFNBQVMsRUFBRyxPQUFlLENBQUMsU0FBUzthQUN0QztZQUNELEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLEVBQUU7Z0JBQ0YsUUFBUTthQUNUO1lBQ0QsTUFBTTtZQUNOLEtBQUs7WUFDTCxPQUFPLEVBQUUsWUFBWTtTQUN0QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztRQUNoQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLEtBQUssRUFBRSw4QkFBOEI7WUFDckMsT0FBTyxFQUFFLENBQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLE9BQU8sS0FBSSxDQUFDO1NBQ3pCLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQW5QVyxRQUFBLG1CQUFtQix1QkFtUDlCO0FBS0ssTUFBTSxhQUFhLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDakUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFekUsTUFBTSxHQUFHLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7YUFDekMsTUFBTSxDQUFDLGtCQUFrQixDQUFDO2FBQzFCLElBQUksRUFBRSxDQUFDO1FBQ1YsSUFBSSxDQUFDLEdBQUc7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFOUQsTUFBTSxTQUFTLEdBQ2IsS0FBSyxDQUFDLE9BQU8sQ0FBRSxHQUFXLGFBQVgsR0FBRyx1QkFBSCxHQUFHLENBQVUsTUFBTSxDQUFDLElBQUssR0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3hFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixLQUFLLEVBQ0gsZ0ZBQWdGO2FBQ25GLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLHVCQUFhLENBQUMsU0FBUyxDQUMzQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFDWCxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUN0RCxDQUFDO1FBRUYsSUFBSSxDQUFDLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxLQUFLLEtBQUksU0FBUyxDQUFDLE1BQU0sQ0FBRSxHQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2pFLE1BQU0sZUFBSyxDQUFDLFNBQVMsQ0FDbkIsRUFBRSxHQUFHLEVBQUcsR0FBVyxDQUFDLEtBQUssRUFBRSxFQUMzQixFQUFFLEtBQUssRUFBRSxFQUFFLGNBQWMsRUFBRyxHQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDaEQsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDM0UsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBckNXLFFBQUEsYUFBYSxpQkFxQ3hCIn0=