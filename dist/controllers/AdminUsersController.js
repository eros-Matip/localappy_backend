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
const mongoose_1 = __importDefault(require("mongoose"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Owner_1 = __importDefault(require("../models/Owner"));
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const safeStr = (v) => String(v !== null && v !== void 0 ? v : "").trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toObjectId = (id) => {
    if (!mongoose_1.default.isValidObjectId(id))
        return null;
    return new mongoose_1.default.Types.ObjectId(id);
};
const parsePaging = (req) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit || DEFAULT_LIMIT)));
    return { page, limit, skip: (page - 1) * limit };
};
const roleExprForCustomer = {
    $cond: [
        { $gt: [{ $size: { $ifNull: ["$establishmentStaffOf", []] } }, 0] },
        "staff",
        "customer",
    ],
};
const buildSearchMatchForCustomer = (q) => {
    const s = safeStr(q);
    if (!s)
        return {};
    const rx = new RegExp(escapeRegex(s), "i");
    const numeric = Number(s);
    const hasNumeric = Number.isFinite(numeric);
    return {
        $or: [
            { email: rx },
            { "account.firstname": rx },
            { "account.name": rx },
            { "account.city": rx },
            { "account.address": rx },
            ...(hasNumeric
                ? [{ "account.zip": numeric }, { "account.phoneNumber": numeric }]
                : []),
        ],
    };
};
const buildSearchMatchForOwner = (q) => {
    const s = safeStr(q);
    if (!s)
        return {};
    const rx = new RegExp(escapeRegex(s), "i");
    const numeric = Number(s);
    const hasNumeric = Number.isFinite(numeric);
    return {
        $or: [
            { email: rx },
            { "account.firstname": rx },
            { "account.name": rx },
            ...(hasNumeric ? [{ "account.phoneNumber": numeric }] : []),
        ],
    };
};
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const role = safeStr(req.query.role || "all");
        const q = safeStr(req.query.q);
        const { page, limit, skip } = parsePaging(req);
        const customerMatch = buildSearchMatchForCustomer(q);
        const ownerMatch = buildSearchMatchForOwner(q);
        const roleFilterStage = role === "owner"
            ? { $match: { role: "owner" } }
            : role === "staff"
                ? { $match: { role: "staff" } }
                : role === "customer"
                    ? { $match: { role: "customer" } }
                    : null;
        const pipeline = [
            { $match: customerMatch },
            {
                $addFields: {
                    userType: "customer",
                    role: roleExprForCustomer,
                },
            },
            {
                $project: {
                    _id: 1,
                    userType: 1,
                    role: 1,
                    email: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    premiumStatus: 1,
                    language: 1,
                    account: 1,
                    picture: 1,
                    establishmentsCount: {
                        $size: { $ifNull: ["$establishmentStaffOf", []] },
                    },
                    establishmentsOwnedCount: {
                        $cond: [{ $ifNull: ["$ownerAccount", false] }, 1, 0],
                    },
                },
            },
            {
                $unionWith: {
                    coll: "owners",
                    pipeline: [
                        { $match: ownerMatch },
                        {
                            $addFields: {
                                userType: "owner",
                                role: "owner",
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                userType: 1,
                                role: 1,
                                email: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                isValidated: 1,
                                isVerified: 1,
                                attempts: 1,
                                account: 1,
                                picture: 1,
                                establishmentsCount: {
                                    $size: { $ifNull: ["$establishments", []] },
                                },
                            },
                        },
                    ],
                },
            },
            ...(roleFilterStage ? [roleFilterStage] : []),
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    rows: [{ $skip: skip }, { $limit: limit }],
                    meta: [{ $count: "total" }],
                },
            },
        ];
        const agg = yield Customer_1.default.aggregate(pipeline).option({ maxTimeMS: 25000 });
        const rows = (_b = (_a = agg === null || agg === void 0 ? void 0 : agg[0]) === null || _a === void 0 ? void 0 : _a.rows) !== null && _b !== void 0 ? _b : [];
        const total = (_f = (_e = (_d = (_c = agg === null || agg === void 0 ? void 0 : agg[0]) === null || _c === void 0 ? void 0 : _c.meta) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.total) !== null && _f !== void 0 ? _f : 0;
        return res.status(200).json({
            filters: { role, q },
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            rows: rows.map((u) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                return ({
                    id: String(u._id),
                    userType: u.userType,
                    role: u.role,
                    email: u.email,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt,
                    account: {
                        firstname: (_b = (_a = u === null || u === void 0 ? void 0 : u.account) === null || _a === void 0 ? void 0 : _a.firstname) !== null && _b !== void 0 ? _b : "",
                        name: (_d = (_c = u === null || u === void 0 ? void 0 : u.account) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "",
                        phoneNumber: (_f = (_e = u === null || u === void 0 ? void 0 : u.account) === null || _e === void 0 ? void 0 : _e.phoneNumber) !== null && _f !== void 0 ? _f : null,
                        address: (_h = (_g = u === null || u === void 0 ? void 0 : u.account) === null || _g === void 0 ? void 0 : _g.address) !== null && _h !== void 0 ? _h : "",
                        zip: (_k = (_j = u === null || u === void 0 ? void 0 : u.account) === null || _j === void 0 ? void 0 : _j.zip) !== null && _k !== void 0 ? _k : null,
                        city: (_m = (_l = u === null || u === void 0 ? void 0 : u.account) === null || _l === void 0 ? void 0 : _l.city) !== null && _m !== void 0 ? _m : "",
                    },
                    picture: (_o = u.picture) !== null && _o !== void 0 ? _o : null,
                    premiumStatus: typeof u.premiumStatus === "boolean" ? u.premiumStatus : undefined,
                    language: (_p = u.language) !== null && _p !== void 0 ? _p : undefined,
                    isValidated: typeof u.isValidated === "boolean" ? u.isValidated : undefined,
                    isVerified: typeof u.isVerified === "boolean" ? u.isVerified : undefined,
                    attempts: typeof u.attempts === "number" ? u.attempts : undefined,
                    establishmentsCount: (_q = u.establishmentsCount) !== null && _q !== void 0 ? _q : 0,
                });
            }),
        });
    }
    catch (error) {
        Retour_1.default.error(`Admin users list error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to list users",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userType = safeStr(req.params.userType);
        const id = safeStr(req.params.id);
        const oid = toObjectId(id);
        if (!oid)
            return res.status(400).json({ error: "Invalid id" });
        if (userType === "customer") {
            const customer = yield Customer_1.default.findById(oid)
                .populate("ownerAccount", "email account.firstname account.name isValidated isVerified")
                .populate("establishmentStaffOf", "name address.city address.postalCode address.zip")
                .lean();
            if (!customer)
                return res.status(404).json({ error: "Customer not found" });
            const role = ((_a = customer === null || customer === void 0 ? void 0 : customer.establishmentStaffOf) === null || _a === void 0 ? void 0 : _a.length) > 0
                ? "staff"
                : "customer";
            return res.status(200).json({
                userType: "customer",
                role,
                customer,
            });
        }
        if (userType === "owner") {
            const owner = yield Owner_1.default.findById(oid)
                .populate("customerAccount", "email account.firstname account.name")
                .populate("establishments", "name address.city address.postalCode address.zip")
                .lean();
            if (!owner)
                return res.status(404).json({ error: "Owner not found" });
            return res.status(200).json({
                userType: "owner",
                role: "owner",
                owner,
            });
        }
        return res.status(400).json({ error: "userType must be customer|owner" });
    }
    catch (error) {
        Retour_1.default.error(`Admin getUser error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to get user",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = safeStr(req.params.id);
        const oid = toObjectId(id);
        if (!oid)
            return res.status(400).json({ error: "Invalid id" });
        const body = req.body || {};
        const update = {};
        if (body.email != null)
            update.email = safeStr(body.email).toLowerCase();
        if (body.account) {
            if (body.account.firstname != null)
                update["account.firstname"] = safeStr(body.account.firstname);
            if (body.account.name != null)
                update["account.name"] = safeStr(body.account.name);
            if (body.account.address != null)
                update["account.address"] = safeStr(body.account.address);
            if (body.account.city != null)
                update["account.city"] = safeStr(body.account.city);
            if (body.account.phoneNumber != null && body.account.phoneNumber !== "") {
                const pn = Number(body.account.phoneNumber);
                if (!Number.isNaN(pn))
                    update["account.phoneNumber"] = pn;
            }
            if (body.account.zip != null && body.account.zip !== "") {
                const z = Number(body.account.zip);
                if (!Number.isNaN(z))
                    update["account.zip"] = z;
            }
        }
        if (typeof body.premiumStatus === "boolean")
            update.premiumStatus = body.premiumStatus;
        if (body.language != null) {
            const lang = safeStr(body.language);
            const allowed = ["fr", "en", "es", "de", "it", "eu"];
            if (!allowed.includes(lang)) {
                return res.status(400).json({ error: "Invalid language" });
            }
            update.language = lang;
        }
        const customer = yield Customer_1.default.findByIdAndUpdate(oid, update, {
            new: true,
        }).lean();
        if (!customer)
            return res.status(404).json({ error: "Customer not found" });
        return res.status(200).json({ customer });
    }
    catch (error) {
        Retour_1.default.error(`Admin updateCustomer error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to update customer",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
const updateOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = safeStr(req.params.id);
        const oid = toObjectId(id);
        if (!oid)
            return res.status(400).json({ error: "Invalid id" });
        const body = req.body || {};
        const update = {};
        if (body.email != null)
            update.email = safeStr(body.email).toLowerCase();
        if (body.account) {
            if (body.account.firstname != null)
                update["account.firstname"] = safeStr(body.account.firstname);
            if (body.account.name != null)
                update["account.name"] = safeStr(body.account.name);
            if (body.account.phoneNumber != null && body.account.phoneNumber !== "") {
                const pn = Number(body.account.phoneNumber);
                if (!Number.isNaN(pn))
                    update["account.phoneNumber"] = pn;
            }
        }
        if (typeof body.isValidated === "boolean")
            update.isValidated = body.isValidated;
        if (typeof body.isVerified === "boolean")
            update.isVerified = body.isVerified;
        if (body.attempts != null && body.attempts !== "") {
            const a = Number(body.attempts);
            if (!Number.isNaN(a))
                update.attempts = a;
        }
        const owner = yield Owner_1.default.findByIdAndUpdate(oid, update, {
            new: true,
        }).lean();
        if (!owner)
            return res.status(404).json({ error: "Owner not found" });
        return res.status(200).json({ owner });
    }
    catch (error) {
        Retour_1.default.error(`Admin updateOwner error: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return res.status(500).json({
            error: "Failed to update owner",
            details: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.default = {
    listUsers,
    getUser,
    updateCustomer,
    updateOwner,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Vc2Vyc0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQWRtaW5Vc2Vyc0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3REFBbUQ7QUFDbkQsK0RBQXVDO0FBRXZDLGtFQUEwQztBQUMxQyw0REFBb0M7QUFFcEMsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBQ3pCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQztBQUV0QixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQVUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsYUFBRCxDQUFDLGNBQUQsQ0FBQyxHQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3ZELE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBRTVFLE1BQU0sVUFBVSxHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUU7SUFDaEMsSUFBSSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQy9DLE9BQU8sSUFBSSxrQkFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFZLEVBQUUsRUFBRTtJQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUNwQixTQUFTLEVBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUs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