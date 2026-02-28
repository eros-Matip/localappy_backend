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
