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
exports.getDashboardStats = exports.getTopScannedEstablishments = exports.getQrScanStats = exports.getTopCities = exports.getCityConsultationStats = exports.getLoginStats = void 0;
const DailyLogin_1 = __importDefault(require("../models/DailyLogin"));
const DailyCityConsultationStat_1 = __importDefault(require("../models/DailyCityConsultationStat"));
const QrScan_1 = __importDefault(require("../models/QrScan"));
const buildDateRange = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
};
const getDateStringsFromRange = (days) => {
    const { start } = buildDateRange(days);
    const dates = [];
    const current = new Date(start);
    for (let i = 0; i < days; i++) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        dates.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
    }
    return dates;
};
const getLoginStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysRaw = Number(req.query.days || 14);
        const days = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), 90)
            : 14;
        const dates = getDateStringsFromRange(days);
        const rows = yield DailyLogin_1.default.find({
            date: { $in: dates },
        })
            .sort({ date: 1 })
            .lean();
        const map = new Map(rows.map((row) => [row.date, row]));
        const data = dates.map((date) => {
            const row = map.get(date);
            return {
                date,
                totalConnections: (row === null || row === void 0 ? void 0 : row.totalConnections) || 0,
                customerConnections: (row === null || row === void 0 ? void 0 : row.customerConnections) || 0,
                ownerConnections: (row === null || row === void 0 ? void 0 : row.ownerConnections) || 0,
                adminConnections: (row === null || row === void 0 ? void 0 : row.adminConnections) || 0,
            };
        });
        return res.status(200).json({ days, data });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching login stats",
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.getLoginStats = getLoginStats;
const getCityConsultationStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysRaw = Number(req.query.days || 14);
        const days = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), 90)
            : 14;
        const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;
        const dates = getDateStringsFromRange(days);
        const query = {
            date: { $in: dates },
        };
        if (city) {
            query.city = city;
        }
        const rows = yield DailyCityConsultationStat_1.default.find(query)
            .sort({ date: 1, city: 1 })
            .lean();
        return res.status(200).json({
            days,
            city: city || null,
            data: rows,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching city consultation stats",
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.getCityConsultationStats = getCityConsultationStats;
const getTopCities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysRaw = Number(req.query.days || 14);
        const limitRaw = Number(req.query.limit || 10);
        const days = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), 90)
            : 14;
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 10;
        const dates = getDateStringsFromRange(days);
        const rows = yield DailyCityConsultationStat_1.default.aggregate([
            {
                $match: {
                    date: { $in: dates },
                },
            },
            {
                $group: {
                    _id: "$city",
                    totalConsultations: { $sum: "$totalConsultations" },
                },
            },
            { $sort: { totalConsultations: -1 } },
            { $limit: limit },
        ]);
        return res.status(200).json({
            days,
            limit,
            data: rows.map((row) => ({
                city: row._id,
                totalConsultations: row.totalConsultations,
            })),
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching top cities",
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.getTopCities = getTopCities;
const getQrScanStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysRaw = Number(req.query.days || 14);
        const days = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), 90)
            : 14;
        const { start, end } = buildDateRange(days);
        const [totalScans, scansBySource, scansPerDay] = yield Promise.all([
            QrScan_1.default.countDocuments({
                scannedAt: { $gte: start, $lte: end },
            }),
            QrScan_1.default.aggregate([
                {
                    $match: {
                        scannedAt: { $gte: start, $lte: end },
                    },
                },
                {
                    $group: {
                        _id: { $ifNull: ["$source", "unknown"] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),
            QrScan_1.default.aggregate([
                {
                    $match: {
                        scannedAt: { $gte: start, $lte: end },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$scannedAt",
                                timezone: "Europe/Paris",
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);
        const dateList = getDateStringsFromRange(days);
        const perDayMap = new Map(scansPerDay.map((row) => [row._id, row.count]));
        const perDay = dateList.map((date) => ({
            date,
            count: perDayMap.get(date) || 0,
        }));
        return res.status(200).json({
            days,
            totalScans,
            bySource: scansBySource.map((row) => ({
                source: row._id || "unknown",
                count: row.count,
            })),
            perDay,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching QR scan stats",
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.getQrScanStats = getQrScanStats;
const getTopScannedEstablishments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysRaw = Number(req.query.days || 14);
        const limitRaw = Number(req.query.limit || 10);
        const days = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), 90)
            : 14;
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 10;
        const { start, end } = buildDateRange(days);
        const rows = yield QrScan_1.default.aggregate([
            {
                $match: {
                    scannedAt: { $gte: start, $lte: end },
                    establishment: { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: "$establishment",
                    totalScans: { $sum: 1 },
                    lastScanAt: { $max: "$scannedAt" },
                    tableScans: {
                        $sum: {
                            $cond: [{ $eq: ["$source", "table"] }, 1, 0],
                        },
                    },
                    flyerScans: {
                        $sum: {
                            $cond: [{ $eq: ["$source", "flyer"] }, 1, 0],
                        },
                    },
                    stickerScans: {
                        $sum: {
                            $cond: [{ $eq: ["$source", "sticker"] }, 1, 0],
                        },
                    },
                    unknownScans: {
                        $sum: {
                            $cond: [{ $eq: ["$source", "unknown"] }, 1, 0],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "establishments",
                    localField: "_id",
                    foreignField: "_id",
                    as: "establishment",
                },
            },
            {
                $unwind: {
                    path: "$establishment",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 0,
                    establishmentId: "$_id",
                    totalScans: 1,
                    lastScanAt: 1,
                    bySource: {
                        table: "$tableScans",
                        flyer: "$flyerScans",
                        sticker: "$stickerScans",
                        unknown: "$unknownScans",
                    },
                    name: {
                        $ifNull: [
                            "$establishment.name",
                            {
                                $ifNull: ["$establishment.title", "Établissement inconnu"],
                            },
                        ],
                    },
                    city: {
                        $ifNull: ["$establishment.city", null],
                    },
                    slug: {
                        $ifNull: ["$establishment.slug", null],
                    },
                },
            },
            {
                $sort: {
                    totalScans: -1,
                    lastScanAt: -1,
                },
            },
            {
                $limit: limit,
            },
        ]);
        return res.status(200).json({
            days,
            limit,
            data: rows,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching top scanned establishments",
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.getTopScannedEstablishments = getTopScannedEstablishments;
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysRaw = Number(req.query.days || 14);
        const days = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), 90)
            : 14;
        const dates = getDateStringsFromRange(days);
        const { start, end } = buildDateRange(days);
        const [loginStats, cityConsultations, topCities, totalQrScans] = yield Promise.all([
            DailyLogin_1.default.find({ date: { $in: dates } })
                .sort({ date: 1 })
                .lean(),
            DailyCityConsultationStat_1.default.find({ date: { $in: dates } })
                .sort({ date: 1, city: 1 })
                .lean(),
            DailyCityConsultationStat_1.default.aggregate([
                { $match: { date: { $in: dates } } },
                {
                    $group: {
                        _id: "$city",
                        totalConsultations: { $sum: "$totalConsultations" },
                    },
                },
                { $sort: { totalConsultations: -1 } },
                { $limit: 10 },
            ]),
            QrScan_1.default.countDocuments({
                scannedAt: { $gte: start, $lte: end },
            }),
        ]);
        return res.status(200).json({
            days,
            loginStats,
            cityConsultations,
            topCities: topCities.map((row) => ({
                city: row._id,
                totalConsultations: row.totalConsultations,
            })),
            totalQrScans,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching dashboard stats",
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
    }
});
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRtaW5TdGF0c0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvYWRtaW5TdGF0c0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esc0VBQWtEO0FBQ2xELG9HQUE0RTtBQUM1RSw4REFBc0M7QUFFdEMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUUzQixPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUVGLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUMvQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztJQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDOUIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25DLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FB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