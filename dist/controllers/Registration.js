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
exports.validateRegistrationAndCheckIn = validateRegistrationAndCheckIn;
const Registration_1 = __importDefault(require("../models/Registration"));
const mongoose_1 = require("mongoose");
const Retour_1 = __importDefault(require("../library/Retour"));
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
    updateRegistration,
    deleteRegistration,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL1JlZ2lzdHJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQW9MQSx3RUFzQ0M7QUF2TkQsMEVBQWtEO0FBQ2xELHVDQUEyQztBQUMzQywrREFBdUM7QUFFdkMsTUFBTSxnQkFBZ0IsR0FBRyxDQUN2QixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUVqRCxPQUFPLHNCQUFZLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQztTQUN6QyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUNyQixZQUFZO1FBQ1YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDO1FBQ2pELENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUNuRDtTQUNBLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sZ0NBQWdDLEdBQUcsQ0FDdkMsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDNUIsTUFBTSxFQUFFLEdBQUksR0FBRyxD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