"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.validateRegistrationAndCheckIn = validateRegistrationAndCheckIn;
const Registration_1 = __importDefault(require("../models/Registration"));
const mongoose_1 = __importStar(require("mongoose"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const readRegistration = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const registrationId = req.params.registrationId;
    return Registration_1.default.findById(registrationId)
        .then((registration) => registration
        ? res.status(200).json({ message: registration })
        : res.status(404).json({ message: "Not found" }))
        .catch((error) => res.status(500).json({ error: error.message }));
});
const getUserReservationsGroupedByDate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.body.admin;
        const tz = req.query.tz || "Europe/Paris";
        if (!user) {
            Retour_1.default.error("Invalid user");
            return res.status(400).json({ error: "Invalid user" });
        }
        const pipeline = [
            {
                $match: { customer: user._id, status: { $in: ["paid", "confirmed"] } },
            },
            {
                $addFields: {
                    _dayKey: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: tz },
                    },
                    _ts: { $toLong: "$date" },
                },
            },
            {
                $group: {
                    _id: { event: "$event", dayKey: "$_dayKey" },
                    qtyForThisDate: { $sum: "$quantity" },
                    tsMax: { $max: "$_ts" },
                    registrations: {
                        $push: {
                            _id: "$_id",
                            bill: "$bill",
                            invoiceNumber: "$invoiceNumber",
                            price: "$price",
                            checkInStatus: "$checkInStatus",
                        },
                    },
                    checkedInCount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$checkInStatus", "checked-in"] },
                                "$quantity",
                                0,
                            ],
                        },
                    },
                    pendingCount: {
                        $sum: {
                            $cond: [{ $eq: ["$checkInStatus", "pending"] }, "$quantity", 0],
                        },
                    },
                    noShowCount: {
                        $sum: {
                            $cond: [{ $eq: ["$checkInStatus", "no-show"] }, "$quantity", 0],
                        },
                    },
                    totalPaid: { $sum: "$price" },
                },
            },
            {
                $project: {
                    eventId: "$_id.event",
                    _regKey: "$_id.dayKey",
                    _regTs: "$tsMax",
                    _qtyForThisDate: "$qtyForThisDate",
                    _registrationIds: "$registrations._id",
                    _bills: "$registrations.bill",
                    _invoiceNumbers: "$registrations.invoiceNumber",
                    _checkInStatuses: "$registrations.checkInStatus",
                    _checkInCounts: {
                        checkedIn: "$checkedInCount",
                        pending: "$pendingCount",
                        noShow: "$noShowCount",
                    },
                    _totalPaid: "$totalPaid",
                    _id: 0,
                },
            },
            {
                $lookup: {
                    from: "events",
                    localField: "eventId",
                    foreignField: "_id",
                    as: "event",
                },
            },
            { $unwind: "$event" },
            {
                $project: {
                    _id: "$event._id",
                    title: "$event.title",
                    startingDate: "$event.startingDate",
                    endingDate: "$event.endingDate",
                    image: "$event.image",
                    theme: "$event.theme",
                    address: "$event.address",
                    _regKey: 1,
                    _regTs: 1,
                    _qtyForThisDate: 1,
                    _registrationIds: 1,
                    _bills: 1,
                    _invoiceNumbers: 1,
                    _totalPaid: 1,
                    _checkInStatuses: 1,
                    _checkInCounts: 1,
                },
            },
            { $sort: { _regTs: -1 } },
        ];
        const rows = yield Registration_1.default.aggregate(pipeline).allowDiskUse(true);
        Retour_1.default.info("Registration readed");
        return res.status(200).json({ items: rows });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Server error" });
    }
});
const readRegistrationByEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { establishmentId } = req.params;
        const tz = req.query.tz || "Europe/Paris";
        if (!establishmentId || !mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ error: "Invalid establishmentId" });
        }
        const est = yield Establishment_1.default.findById(establishmentId);
        if (!est) {
            return res.status(404).json({ error: "Establishment not found" });
        }
        const estObjectId = new mongoose_1.default.Types.ObjectId(establishmentId);
        const pipeline = [
            {
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "event",
                },
            },
            { $unwind: "$event" },
            {
                $match: {
                    "event.organizer.establishment": estObjectId,
                    status: { $in: ["paid", "confirmed"] },
                },
            },
            {
                $lookup: {
                    from: "customers",
                    localField: "customer",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$customer" },
            {
                $addFields: {
                    _dayKey: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$date",
                            timezone: tz,
                        },
                    },
                    _ts: { $toLong: "$date" },
                },
            },
            {
                $group: {
                    _id: { event: "$event._id", dayKey: "$_dayKey" },
                    qtyForThisDate: { $sum: "$quantity" },
                    tsMax: { $max: "$_ts" },
                    registrations: {
                        $push: {
                            _id: "$_id",
                            bill: "$bill",
                            invoiceNumber: "$invoiceNumber",
                            price: "$price",
                            quantity: "$quantity",
                            checkInStatus: "$checkInStatus",
                            customer: {
                                _id: "$customer._id",
                                firstname: "$customer.account.firstname",
                                lastname: "$customer.account.name",
                                email: "$customer.email",
                            },
                        },
                    },
                    checkedInCount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$checkInStatus", "checked-in"] },
                                "$quantity",
                                0,
                            ],
                        },
                    },
                    pendingCount: {
                        $sum: {
                            $cond: [{ $eq: ["$checkInStatus", "pending"] }, "$quantity", 0],
                        },
                    },
                    noShowCount: {
                        $sum: {
                            $cond: [{ $eq: ["$checkInStatus", "no-show"] }, "$quantity", 0],
                        },
                    },
                    totalPaid: { $sum: "$price" },
                    eventDoc: { $first: "$event" },
                },
            },
            {
                $project: {
                    _id: 0,
                    dayKey: "$_id.dayKey",
                    regTs: "$tsMax",
                    eventId: "$eventDoc._id",
                    title: "$eventDoc.title",
                    startingDate: "$eventDoc.startingDate",
                    endingDate: "$eventDoc.endingDate",
                    image: "$eventDoc.image",
                    theme: "$eventDoc.theme",
                    address: "$eventDoc.address",
                    registrations: 1,
                    checkedInCount: 1,
                    pendingCount: 1,
                    noShowCount: 1,
                    checkInCounts: {
                        checkedIn: "$checkedInCount",
                        pending: "$pendingCount",
                        noShow: "$noShowCount",
                    },
                    qtyForThisDate: "$qtyForThisDate",
                    totalPaid: "$totalPaid",
                },
            },
            {
                $group: {
                    _id: "$dayKey",
                    date: { $first: "$dayKey" },
                    regTs: { $max: "$regTs" },
                    totalTicketsForDay: { $sum: "$qtyForThisDate" },
                    checkedInForDay: { $sum: "$checkedInCount" },
                    pendingForDay: { $sum: "$pendingCount" },
                    noShowForDay: { $sum: "$noShowCount" },
                    events: {
                        $push: {
                            eventId: "$eventId",
                            title: "$title",
                            startingDate: "$startingDate",
                            endingDate: "$endingDate",
                            image: "$image",
                            theme: "$theme",
                            address: "$address",
                            registrations: "$registrations",
                            checkInCounts: "$checkInCounts",
                            qtyForThisDate: "$qtyForThisDate",
                            totalPaid: "$totalPaid",
                        },
                    },
                },
            },
            { $sort: { regTs: -1 } },
        ];
        const rows = yield Registration_1.default.aggregate(pipeline).allowDiskUse(true);
        Retour_1.default.info(`Registration grouped by date & event for establishment ${establishmentId}, items: ${rows.length}`);
        return res.status(200).json({ items: rows });
    }
    catch (error) {
        console.error("readRegistrationByEstablishment error:", error);
        return res.status(500).json({ error: error.message || "Server error" });
    }
});
const updateRegistration = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const registrationId = req.params.registrationId;
    return Registration_1.default.findById(registrationId).then((registration) => __awaiter(void 0, void 0, void 0, function* () {
        if (!registration) {
            return res.status(404).json({ message: "Not found" });
        }
        else {
            registration.set(req.body);
            return registration
                .save()
                .then((registration) => res.status(201).json({ registration: registration }))
                .catch((error) => res.status(500).json({ error: error.message }));
        }
    }));
});
function validateRegistrationAndCheckIn(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { registrationId, ticketNumber, merchantId } = params;
        const query = {};
        if (registrationId)
            query._id = registrationId;
        if (ticketNumber)
            query.ticketNumber = ticketNumber;
        const reg = yield Registration_1.default.findOne(query);
        if (!reg) {
            throw new Error("REGISTRATION_NOT_FOUND");
        }
        if (reg.checkInStatus === "checked-in") {
            return { code: "ALREADY_SCANNED", registration: reg };
        }
        const allowedStatuses = ["paid", "confirmed"];
        if (!allowedStatuses.includes(reg.status)) {
            throw new Error("REGISTRATION_NOT_ELIGIBLE");
        }
        reg.checkInStatus = "checked-in";
        reg.checkedInAt = new Date();
        reg.checkedInBy = new mongoose_1.Types.ObjectId(merchantId);
        yield reg.save();
        return { code: "OK", registration: reg };
    });
}
const deleteRegistration = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const registrationId = req.params.registrationId;
    return Registration_1.default.findByIdAndDelete(registrationId)
        .then((registration) => registration
        ? res.status(200).json({ message: "CRE is deleted" })
        : res.status(404).json({ message: "Not found" }))
        .catch((error) => res.status(500).json({ error: error.message }));
});
exports.default = {
    readRegistration,
    getUserReservationsGroupedByDate,
    readRegistrationByEstablishment,
    updateRegistration,
    deleteRegistration,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL1JlZ2lzdHJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdYQSx3RUFnQ0M7QUFyWkQsMEVBQWtEO0FBQ2xELHFEQUEyQztBQUMzQywrREFBdUM7QUFDdkMsNEVBQW9EO0FBRXBELE1BQU0sZ0JBQWdCLEdBQUcsQ0FDdkIsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7SUFFakQsT0FBTyxzQkFBWSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7U0FDekMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FDckIsWUFBWTtRQUNWLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQztRQUNqRCxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDbkQ7U0FDQSxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFBLENBQUM7QUFFRixNQUFNLGdDQUFnQyxHQUFHLENBQ3ZDLEdBQVksRUFDWixHQUFhLEVBQ2IsSUFBa0IsRUFDbEIsRUFBRTtJQUNGLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJ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