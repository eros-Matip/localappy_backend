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
        return {
            code: "OK",
            registration: reg,
        };
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
    readRegistrationByEstablishment,
    getUserReservationsGroupedByDate,
    updateRegistration,
    deleteRegistration,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL1JlZ2lzdHJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThWQSx3RUF3Q0M7QUFuWUQsMEVBQWtEO0FBQ2xELHFEQUEyQztBQUMzQywrREFBdUM7QUFDdkMsNEVBQW9EO0FBR3BELE1BQU0sK0JBQStCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLGVBQWUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDdkMsTUFBTSxFQUFFLEdBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFhLElBQUksY0FBYyxDQUFDO1FBRXRELElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ25FLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNULE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVqRSxNQUFNLFFBQVEsR0FBNkI7WUFFekM7Z0JBQ0UsT0FB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