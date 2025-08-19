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
const Registration_1 = __importDefault(require("../models/Registration"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL1JlZ2lzdHJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUdBLDBFQUFrRDtBQUVsRCwrREFBdUM7QUFFdkMsTUFBTSxnQkFBZ0IsR0FBRyxDQUN2QixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUVqRCxPQUFPLHNCQUFZLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQztTQUN6QyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUNyQixZQUFZO1FBQ1YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDO1FBQ2pELENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUNuRDtTQUNBLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sZ0NBQWdDLEdBQUcsQ0FDdkMsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDNUIsTUFBTSxFQUFFLEdBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFhLElBQUksY0FB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