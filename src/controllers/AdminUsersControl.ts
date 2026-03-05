import Customer from "../models/Customer";
import { Request, Response } from "express";
import mongoose from "mongoose";

/* =========================================
   HELPERS
========================================= */

const computeRole = (customer: any) => {
  if (customer.ownerAccount) return "owner";
  if (
    Array.isArray(customer.establishmentStaffOf) &&
    customer.establishmentStaffOf.length > 0
  )
    return "staff";
  return "customer";
};

const sanitizeCustomer = (customer: any) => {
  return {
    _id: customer._id,
    email: customer.email,
    account: customer.account,
    premiumStatus: customer.premiumStatus || false,
    createdAt: customer.createdAt,
    role: computeRole(customer),
    activated: customer.activated !== false,
    banned: customer.banned === true,
  };
};

/* =========================================
   GET /admin/users
========================================= */

export const usersList = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find().lean();

    const users = customers.map(sanitizeCustomer);

    const stats = {
      total: users.length,
      activated: users.filter((u) => u.activated).length,
      banned: users.filter((u) => u.banned).length,
      premium: users.filter((u) => u.premiumStatus).length,
    };

    return res.status(200).json({ users, stats });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching users", error });
  }
};

/* =========================================
   PATCH /admin/users/:userId/ban
========================================= */

export const userBan = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const user = await Customer.findByIdAndUpdate(
      userId,
      { banned: true },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User banned" });
  } catch (error) {
    return res.status(500).json({ message: "Error banning user", error });
  }
};

/* =========================================
   PATCH /admin/users/:userId/unban
========================================= */

export const userUnban = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await Customer.findByIdAndUpdate(
      userId,
      { banned: false },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User unbanned" });
  } catch (error) {
    return res.status(500).json({ message: "Error unbanning user", error });
  }
};

/* =========================================
   PATCH /admin/users/:userId/activate
========================================= */

export const userActivate = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await Customer.findByIdAndUpdate(
      userId,
      { activated: true },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User activated" });
  } catch (error) {
    return res.status(500).json({ message: "Error activating user", error });
  }
};

/* =========================================
   PATCH /admin/users/:userId/disable
========================================= */

export const userDisable = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await Customer.findByIdAndUpdate(
      userId,
      { activated: false },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User disabled" });
  } catch (error) {
    return res.status(500).json({ message: "Error disabling user", error });
  }
};

/* =========================================
   PATCH /admin/users/:userId/premium
   body: { premiumStatus: boolean }
========================================= */

export const userSetPremium = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { premiumStatus } = req.body;

    if (typeof premiumStatus !== "boolean") {
      return res.status(400).json({ message: "premiumStatus must be boolean" });
    }

    const user = await Customer.findByIdAndUpdate(
      userId,
      { premiumStatus },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "Premium status updated" });
  } catch (error) {
    return res.status(500).json({ message: "Error updating premium", error });
  }
};
/* =========================================
   GET /admin/stats/new-customers-per-day?days=14
   -> [{ date: "YYYY-MM-DD", count: number }]
========================================= */

export const newCustomersPerDay = async (req: Request, res: Response) => {
  try {
    const daysRaw = Number(req.query.days || 14);
    const days = Number.isFinite(daysRaw)
      ? Math.min(Math.max(daysRaw, 1), 90)
      : 14;

    const timezone = "Europe/Paris";

    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    // ✅ createdAtSafe = createdAt si existe, sinon date extraite de l'ObjectId
    const rows = await Customer.aggregate([
      {
        $addFields: {
          createdAtSafe: {
            $ifNull: ["$createdAt", { $toDate: "$_id" }],
          },
        },
      },
      { $match: { createdAtSafe: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAtSafe",
              timezone,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map<string, number>();
    for (const r of rows) map.set(r._id, r.count);

    // ✅ remplir les jours manquants à 0
    const data: { date: string; count: number }[] = [];
    const cur = new Date(start);

    for (let i = 0; i < days; i++) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, "0");
      const dd = String(cur.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;

      data.push({ date: key, count: map.get(key) || 0 });
      cur.setDate(cur.getDate() + 1);
    }

    return res.status(200).json({ days, timezone, data });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching new customers per day",
      error: error?.message || error,
    });
  }
};

/* =========================================
   DELETE /admin/users/:userId
========================================= */

export const userDelete = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await Customer.findByIdAndDelete(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting user", error });
  }
};
