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
exports.deleteCompany = exports.disableCompany = exports.activateCompany = exports.unbanCompany = exports.banCompany = exports.validateCompany = exports.getCompanyById = exports.listCompanies = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Owner_1 = __importDefault(require("../models/Owner"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Db21wYW5pZXNDb250cm9sLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL0FkbWluQ29tcGFuaWVzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBZ0M7QUFDaEMsNEVBQW9EO0FBQ3BELDREQUFvQztBQUtwQyxNQUFNLFNBQVMsR0FBUSxDQUFDLEVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7QUFNcEUsTUFBTSxRQUFRLEdBQUcsQ0FDZixTQUE2QixFQUM3QixVQUE4QixFQUM5QixFQUFFO0lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsSUFBSSxXQUFXLENBQUMsQ0FBQztJQUNoRCxNQUFNLEdBQUcsR0FDUCxNQUFNLENBQUMsVUFBVSxJQUFJLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUdoRSxNQUFNLE9BQU8sR0FBd0I7UUFDbkMsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUM3QixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ25CLElBQUksRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDN0IsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUU7S0FDOUIsQ0FBQztJQUVGLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUMsQ0FBQyxDQUFDO0FBTUYsTUFBTSxnQkFBZ0Is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