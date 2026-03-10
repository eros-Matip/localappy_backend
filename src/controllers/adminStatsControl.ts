import { Request, Response } from "express";
import DailyLoginStat from "../models/DailyLogin";
import DailyCityConsultationStat from "../models/DailyCityConsultationStat";
import QrScan from "../models/QrScan";

const buildDateRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const getDateStringsFromRange = (days: number) => {
  const { start } = buildDateRange(days);
  const dates: string[] = [];
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

/* =========================================
   GET /admin/stats/logins?days=14
========================================= */

export const getLoginStats = async (req: Request, res: Response) => {
  try {
    const daysRaw = Number(req.query.days || 14);
    const days = Number.isFinite(daysRaw)
      ? Math.min(Math.max(daysRaw, 1), 90)
      : 14;

    const dates = getDateStringsFromRange(days);

    const rows = await DailyLoginStat.find({
      date: { $in: dates },
    })
      .sort({ date: 1 })
      .lean();

    const map = new Map(rows.map((row: any) => [row.date, row]));

    const data = dates.map((date) => {
      const row = map.get(date);

      return {
        date,
        totalConnections: row?.totalConnections || 0,
        customerConnections: row?.customerConnections || 0,
        ownerConnections: row?.ownerConnections || 0,
        adminConnections: row?.adminConnections || 0,
      };
    });

    return res.status(200).json({ days, data });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching login stats",
      error: error?.message || error,
    });
  }
};

/* =========================================
   GET /admin/stats/city-consultations?days=14&city=Paris
========================================= */

export const getCityConsultationStats = async (req: Request, res: Response) => {
  try {
    const daysRaw = Number(req.query.days || 14);
    const days = Number.isFinite(daysRaw)
      ? Math.min(Math.max(daysRaw, 1), 90)
      : 14;

    const city =
      typeof req.query.city === "string" ? req.query.city.trim() : undefined;

    const dates = getDateStringsFromRange(days);

    const query: any = {
      date: { $in: dates },
    };

    if (city) {
      query.city = city;
    }

    const rows = await DailyCityConsultationStat.find(query)
      .sort({ date: 1, city: 1 })
      .lean();

    return res.status(200).json({
      days,
      city: city || null,
      data: rows,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching city consultation stats",
      error: error?.message || error,
    });
  }
};

/* =========================================
   GET /admin/stats/top-cities?days=14&limit=10
========================================= */

export const getTopCities = async (req: Request, res: Response) => {
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

    const rows = await DailyCityConsultationStat.aggregate([
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
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching top cities",
      error: error?.message || error,
    });
  }
};

/* =========================================
   GET /admin/stats/qr-scans?days=14
========================================= */

export const getQrScanStats = async (req: Request, res: Response) => {
  try {
    const daysRaw = Number(req.query.days || 14);
    const days = Number.isFinite(daysRaw)
      ? Math.min(Math.max(daysRaw, 1), 90)
      : 14;

    const { start, end } = buildDateRange(days);

    const [totalScans, scansBySource, scansPerDay] = await Promise.all([
      QrScan.countDocuments({
        scannedAt: { $gte: start, $lte: end },
      }),

      QrScan.aggregate([
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

      QrScan.aggregate([
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
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching QR scan stats",
      error: error?.message || error,
    });
  }
};

/* =========================================
   GET /admin/stats/dashboard?days=14
========================================= */

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const daysRaw = Number(req.query.days || 14);
    const days = Number.isFinite(daysRaw)
      ? Math.min(Math.max(daysRaw, 1), 90)
      : 14;

    const dates = getDateStringsFromRange(days);
    const { start, end } = buildDateRange(days);

    const [loginStats, cityConsultations, topCities, totalQrScans] =
      await Promise.all([
        DailyLoginStat.find({ date: { $in: dates } })
          .sort({ date: 1 })
          .lean(),

        DailyCityConsultationStat.find({ date: { $in: dates } })
          .sort({ date: 1, city: 1 })
          .lean(),

        DailyCityConsultationStat.aggregate([
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

        QrScan.countDocuments({
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
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching dashboard stats",
      error: error?.message || error,
    });
  }
};
