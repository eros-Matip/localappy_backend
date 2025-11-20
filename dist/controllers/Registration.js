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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL1JlZ2lzdHJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdXQSx3RUF3Q0M7QUE3WUQsMEVBQWtEO0FBQ2xELHFEQUEyQztBQUMzQywrREFBdUM7QUFDdkMsNEVBQW9EO0FBRXBELE1BQU0sK0JBQStCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLGVBQWUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDdkMsTUFBTSxFQUFFLEdBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFhLElBQUksY0FBYyxDQUFDO1FBRXRELElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ25FLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNULE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVqRSxNQUFNLFFBQVEsR0FBNkI7WUFFekM7Z0JBQ0UsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxPQUFPO29CQUNuQixZQUFZLEVBQUUsS0FBSztvQkFDbkIsRUFBRSxFQUFFLE9BQU87aUJBQ1o7YUFDRjtZQUNELEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRTtZQUdyQjtnQkFDRSxNQUFNLEVBQUU7b0JBQ04sK0JBQStCLEVBQUUsV0FBVztvQkFDNUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFO2lCQUN2QzthQUNGO1lBR0Q7Z0JBQ0UsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxXQUFXO29CQUNqQixVQUFVLEVBQUUsVUFBVTtvQkFDdEIsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLEVBQUUsRUFBRSxVQUFVO2lCQUNmO2FBQ0Y7WUFDRCxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUU7WUFHeEI7Z0JBQ0UsVUFBVSxFQUFFO29CQUNWLE9BQU8sRUFBRTt3QkFDUCxhQUFhLEVBQUU7NEJBQ2IsTUFBTSxFQUFFLFVBQVU7NEJBQ2xCLElBQUksRUFBRSxPQUFPOzRCQUNiLFFBQVEsRUFBRSxFQUFFO3lCQUNiO3FCQUNGO29CQUNELEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUU7aUJBQzFCO2FBQ0Y7WUFHRDtnQkFDRSxNQUFNLEVBQUU7b0JBQ04sR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFO29CQUVoRCxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFO29CQUNyQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO29CQUd2QixhQUFhLEVBQUU7d0JBQ2IsS0FBSyxFQUFFOzRCQUNMLEdBQUcsRUFBRSxNQUFNOzRCQUNYLElBQUksRUFBRSxPQUFPOzRCQUNiLGFBQWEsRUFBRSxnQkFBZ0I7NEJBQy9CLEtBQUssRUFBRSxRQUFROzRCQUNmLFFBQVEsRUFBRSxXQUFXOzRCQUNyQixhQUFhLEVBQUUsZ0JBQWdCOzRCQUUvQixRQUFRLEVBQUU7Z0NBQ1IsR0FBRyxFQUFFLGVBQWU7Z0NBQ3BCLFNBQVMsRUFBRSw2QkFBNkI7Z0NBQ3hDLFFBQVEsRUFBRSx3QkFBd0I7Z0NBQ2xDLEtBQUssRUFBRSxpQkFBaUI7NkJBQ3pCO3lCQUNGO3FCQUNGO29CQUVELGNBQWMsRUFBRTt3QkFDZCxJQUFJLEVBQUU7NEJBQ0osS0FBSyxFQUFFO2dDQUNMLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLEVBQUU7Z0NBQ3pDLFdBQVc7Z0NBQ1gsQ0FBQzs2QkFDRjt5QkFDRjtxQkFDRjtvQkFDRCxZQUFZLEVBQUU7d0JBQ1osSUFBSSxFQUFFOzRCQUNKLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO3lCQUNoRTtxQkFDRjtvQkFDRCxXQUFXLEVBQUU7d0JBQ1gsSUFBSSxFQUFFOzRCQUNKLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO3lCQUNoRTtxQkFDRjtvQkFFRCxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO29CQUU3QixRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO2lCQUMvQjthQUNGO1lBR0Q7Z0JBQ0UsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxDQUFDO29CQUNOLE1BQU0sRUFBRSxhQUFhO29CQUNyQixLQUFLLEVBQUUsUUFBUTtvQkFFZixPQUFPLEVBQUUsZUFBZTtvQkFDeEIsS0FBSyxFQUFFLGlCQUFpQjtvQkFDeEIsWUFBWSxFQUFFLHdCQUF3QjtvQkFDdEMsVUFBVSxFQUFFLHNCQUFzQjtvQkFDbEMsS0FBSyxFQUFFLGlCQUFpQjtvQkFDeEIsS0FBSyxFQUFFLGlCQUFpQjtvQkFDeEIsT0FBTyxFQUFFLG1CQUFtQjtvQkFFNUIsYUFBYSxFQUFFLENBQUM7b0JBR2hCLGNBQWMsRUFBRSxDQUFDO29CQUNqQixZQUFZLEVBQUUsQ0FBQztvQkFDZixXQUFXLEVBQUUsQ0FBQztvQkFFZCxhQUFhLEVBQUU7d0JBQ2IsU0FBUyxFQUFFLGlCQUFpQjt3QkFDNUIsT0FBTyxFQUFFLGVBQWU7d0JBQ3hCLE1BQU0sRUFBRSxjQUFjO3FCQUN2QjtvQkFFRCxjQUFjLEVBQUUsaUJBQWlCO29CQUNqQyxTQUFTLEVBQUUsWUFBWTtpQkFDeEI7YUFDRjtZQUdEO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixHQUFHLEVBQUUsU0FBUztvQkFDZCxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFO29CQUMzQixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO29CQUd6QixrQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRTtvQkFDL0MsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFO29CQUM1QyxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFO29CQUN4QyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFO29CQUV0QyxNQUFNLEVBQUU7d0JBQ04sS0FBSyxFQUFFOzRCQUNMLE9BQU8sRUFBRSxVQUFVOzRCQUNuQixLQUFLLEVBQUUsUUFBUTs0QkFDZixZQUFZLEVBQUUsZUFBZTs0QkFDN0IsVUFBVSxFQUFFLGFBQWE7NEJBQ3pCLEtBQUssRUFBRSxRQUFROzRCQUNmLEtBQUssRUFBRSxRQUFROzRCQUNmLE9BQU8sRUFBRSxVQUFVOzRCQUVuQixhQUFhLEVBQUUsZ0JBQWdCOzRCQUUvQixhQUFhLEVBQUUsZ0JBQWdCOzRCQUMvQixjQUFjLEVBQUUsaUJBQWlCOzRCQUNqQyxTQUFTLEVBQUUsWUFBWTt5QkFDeEI7cUJBQ0Y7aUJBQ0Y7YUFDRjtZQUdELEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7U0FDekIsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLE1BQU0sc0JBQVksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLGdCQUFNLENBQUMsSUFBSSxDQUNULDBEQUEwRCxlQUFlLFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUNuRyxDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDMUUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxnQ0FBZ0MsR0FBRyxDQUN2QyxHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixJQUFJLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUM1QixNQUFNLEVBQUUsR0FBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQWEsSUFBSSxjQUFjLENBQUM7UUFFdEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBNkI7WUFDekM7Z0JBQ0UsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUU7YUFDdkU7WUFDRDtnQkFDRSxVQUFVLEVBQUU7b0JBQ1YsT0FBTyxFQUFFO3dCQUNQLGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO3FCQUNuRTtvQkFDRCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO2lCQUMxQjthQUNGO1lBQ0Q7Z0JBQ0UsTUFBTSxFQUFFO29CQUNOLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRTtvQkFDNUMsY0FBYyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTtvQkFDckMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtvQkFHdkIsYUFBYSxFQUFFO3dCQUNiLEtBQUssRUFBRTs0QkFDTCxHQUFHLEVBQUUsTUFBTTs0QkFDWCxJQUFJLEVBQUUsT0FBTzs0QkFDYixhQUFhLEVBQUUsZ0JBQWdCOzRCQUMvQixLQUFLLEVBQUUsUUFBUTs0QkFDZixhQUFhLEVBQUUsZ0JBQWdCO3lCQUNoQztxQkFDRjtvQkFHRCxjQUFjLEVBQUU7d0JBQ2QsSUFBSSxFQUFFOzRCQUNKLEtBQUssRUFBRTtnQ0FDTCxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxFQUFFO2dDQUN6QyxXQUFXO2dDQUNYLENBQUM7NkJBQ0Y7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsWUFBWSxFQUFFO3dCQUNaLElBQUksRUFBRTs0QkFDSixLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQzt5QkFDaEU7cUJBQ0Y7b0JBQ0QsV0FBVyxFQUFFO3dCQUNYLElBQUksRUFBRTs0QkFDSixLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQzt5QkFDaEU7cUJBQ0Y7b0JBRUQsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTtpQkFDOUI7YUFDRjtZQUNEO2dCQUNFLFFBQVEsRUFBRTtvQkFDUixPQUFPLEVBQUUsWUFBWTtvQkFDckIsT0FBTyxFQUFFLGFBQWE7b0JBQ3RCLE1BQU0sRUFBRSxRQUFRO29CQUNoQixlQUFlLEVBQUUsaUJBQWlCO29CQUdsQyxnQkFBZ0IsRUFBRSxvQkFBb0I7b0JBQ3RDLE1BQU0sRUFBRSxxQkFBcUI7b0JBQzdCLGVBQWUsRUFBRSw4QkFBOEI7b0JBRy9DLGdCQUFnQixFQUFFLDhCQUE4QjtvQkFHaEQsY0FBYyxFQUFFO3dCQUNkLFNBQVMsRUFBRSxpQkFBaUI7d0JBQzVCLE9BQU8sRUFBRSxlQUFlO3dCQUN4QixNQUFNLEVBQUUsY0FBYztxQkFDdkI7b0JBRUQsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLEdBQUcsRUFBRSxDQUFDO2lCQUNQO2FBQ0Y7WUFDRDtnQkFDRSxPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLFlBQVksRUFBRSxLQUFLO29CQUNuQixFQUFFLEVBQUUsT0FBTztpQkFDWjthQUNGO1lBQ0QsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFO1lBQ3JCO2dCQUNFLFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsWUFBWTtvQkFDakIsS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLFlBQVksRUFBRSxxQkFBcUI7b0JBQ25DLFVBQVUsRUFBRSxtQkFBbUI7b0JBQy9CLEtBQUssRUFBRSxjQUFjO29CQUNyQixLQUFLLEVBQUUsY0FBYztvQkFDckIsT0FBTyxFQUFFLGdCQUFnQjtvQkFFekIsT0FBTyxFQUFFLENBQUM7b0JBQ1YsTUFBTSxFQUFFLENBQUM7b0JBQ1QsZUFBZSxFQUFFLENBQUM7b0JBQ2xCLGdCQUFnQixFQUFFLENBQUM7b0JBQ25CLE1BQU0sRUFBRSxDQUFDO29CQUNULGVBQWUsRUFBRSxDQUFDO29CQUNsQixVQUFVLEVBQUUsQ0FBQztvQkFHYixnQkFBZ0IsRUFBRSxDQUFDO29CQUNuQixjQUFjLEVBQUUsQ0FBQztpQkFDbEI7YUFDRjtZQUNELEVBQUUsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7U0FDMUIsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLE1BQU0sc0JBQVksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLGdCQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDbkMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQUcsQ0FDekIsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7SUFDakQsT0FBTyxzQkFBWSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBTyxZQUFZLEVBQUUsRUFBRTtRQUN2RSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7YUFBTSxDQUFDO1lBQ04sWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0IsT0FBTyxZQUFZO2lCQUNoQixJQUFJLEVBQUU7aUJBQ04sSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FDckIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FDckQ7aUJBQ0EsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7SUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBLENBQUM7QUFFRixTQUFzQiw4QkFBOEIsQ0FBQyxNQUlwRDs7UUFDQyxNQUFNLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFHNUQsTUFBTSxLQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ3RCLElBQUksY0FBYztZQUFFLEtBQUssQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDO1FBQy9DLElBQUksWUFBWTtZQUFFLEtBQUssQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRXBELE1BQU0sR0FBRyxHQUFHLE1BQU0sc0JBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxhQUFhLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDdkMsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBMEIsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDakUsQ0FBQztRQUdELE1BQU0sZUFBZSxHQUFHLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBR0QsR0FBRyxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFDakMsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQzdCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxnQkFBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVqRCxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUdqQixPQUFPO1lBQ0wsSUFBSSxFQUFFLElBQWE7WUFDbkIsWUFBWSxFQUFFLEdBQUc7U0FDbEIsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQUVELE1BQU0sa0JBQWtCLEdBQUcsQ0FDekIsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7SUFFakQsT0FBTyxzQkFBWSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztTQUNsRCxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUNyQixZQUFZO1FBQ1YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLENBQUM7UUFDckQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQ25EO1NBQ0EsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQSxDQUFDO0FBRUYsa0JBQWU7SUFDYiwrQkFBK0I7SUFDL0IsZ0NBQWdDO0lBQ2hDLGtCQUFrQjtJQUNsQixrQkFBa0I7Q0FDbkIsQ0FBQyJ9