import { Request, Response } from "express";
import mongoose from "mongoose";
import Establishment from "../models/Establishment";
import Owner from "../models/Owner";
import Event from "../models/Event"; // utile si tu veux bloquer suppression

type SortDir = 1 | -1;

const isValidId: any = (id: string) => mongoose.isValidObjectId(id);

/* =========================
   SORT
========================= */

const pickSort = (
  sortByRaw: string | undefined,
  sortDirRaw: string | undefined,
) => {
  const sortBy = String(sortByRaw || "createdAt");
  const dir: SortDir =
    String(sortDirRaw || "desc").toLowerCase() === "asc" ? 1 : -1;

  // whitelist (évite l’injection de champs de tri)
  const allowed: Record<string, any> = {
    createdAt: { createdAt: dir },
    name: { name: dir },
    city: { "address.city": dir },
    activated: { activated: dir },
    banned: { banned: dir },
    legalForm: { legalForm: dir },
  };

  return allowed[sortBy] || { createdAt: -1 };
};

/* =========================
   FILTERS
========================= */

const parseDepartments = (req: Request): string[] => {
  const raw = String(req.query.departments || "").trim(); // ex "64,40"
  if (!raw) return [];
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
};

const buildSearchMatch = (q: string) => {
  const query = q.trim();
  if (!query) return null;

  // Regex safe (échappe les caractères spéciaux)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");

  // Recherche multi champs DB
  return {
    $or: [
      { name: { $regex: re } },
      { email: { $regex: re } },
      { phone: { $regex: re } },
      { "address.city": { $regex: re } },
      { "address.street": { $regex: re } },
      { "address.postalCode": { $regex: re } },
      { "legalInfo.siret": { $regex: re } },
      { "legalInfo.rna": { $regex: re } },
      { "legalInfo.activityCodeNAF": { $regex: re } },
      // type est un tableau
      { type: { $elemMatch: { $regex: re } } },
    ],
  };
};

const buildStatusMatch = (status: string) => {
  // all | activated | disabled | banned
  if (!status || status === "all") return null;

  if (status === "banned") return { banned: true };

  // ⚠️ plus strict: activated === true (et pas "$ne false")
  if (status === "activated") return { activated: true, banned: { $ne: true } };

  if (status === "disabled") return { activated: false, banned: { $ne: true } };

  return null;
};

const buildLegalFormMatch = (form: string) => {
  // all | company | association
  if (!form || form === "all") return null;
  return { legalForm: form };
};

const buildDepartmentsMatch = (departments: string[]) => {
  // Tes établissements ont address.postalCode + address.department
  // - address.department (si tu stockes "64")
  // - sinon prefix postalCode "64xxxx"
  if (!departments.length) return null;

  const escaped = departments.map((d) =>
    d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const re = new RegExp(`^(${escaped.join("|")})`);

  return {
    $or: [
      { "address.department": { $in: departments } },
      { "address.postalCode": { $regex: re } },
    ],
  };
};

/* =========================
   PROJECTION / MAPPING
========================= */

const projectForFront = () => ({
  // Champs utilisés par ton front + détails modal
  name: 1,
  legalForm: 1,
  activated: 1,
  banned: 1,
  createdAt: 1,

  type: 1,
  description: 1,

  address: 1,
  email: 1,
  phone: 1,

  legalInfo: 1,
  owner: 1,
});

const mapToFrontShape = (e: any) => ({
  ...e,
  // ton front check city || address.city
  city: e?.address?.city,
  zip: e?.address?.postalCode,
  // ton front check adressLabel / address.label / adress / address.street
  adressLabel: e?.address?.street,
  // activity: ton front attend une string
  activity:
    Array.isArray(e?.type) && e.type.length ? e.type.join(" • ") : e?.type,
  activityCodeNAF: e?.legalInfo?.activityCodeNAF,
  siret: e?.legalInfo?.siret,
  rna: e?.legalInfo?.rna,
  // pour que getCompanyName marche avec c.name
  title: e?.name,
});

/* =========================
   LIST
   GET /companiesControl/companies?q=&form=&status=&departments=&page=&limit=
========================= */

export const listCompanies = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "");
    const form = String(req.query.form || "all");
    const status = String(req.query.status || "all");

    // pagination blindée

    const departments = parseDepartments(req);
    const sort = pickSort(
      String(req.query.sortBy || ""),
      String(req.query.sortDir || ""),
    );

    // Soft delete safe (si tu l’ajoutes un jour)
    const baseMatch: any = {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    const matches = [
      baseMatch,
      buildLegalFormMatch(form),
      buildStatusMatch(status),
      buildDepartmentsMatch(departments),
      buildSearchMatch(q),
    ].filter(Boolean);

    const match = matches.length ? { $and: matches } : {};

    const pipeline: any[] = [
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          items: [
            { $project: projectForFront() },
            {
              $lookup: {
                from: "owners",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDoc",
              },
            },
            {
              $unwind: { path: "$ownerDoc", preserveNullAndEmptyArrays: true },
            },
            {
              $addFields: {
                owner: {
                  email: "$ownerDoc.email",
                  account: {
                    name: "$ownerDoc.account.name",
                    firstname: "$ownerDoc.account.firstname",
                  },
                },
              },
            },
            { $project: { ownerDoc: 0 } },
          ],
          total: [{ $count: "count" }],
          stats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                // strict: true uniquement
                activated: {
                  $sum: { $cond: [{ $eq: ["$activated", true] }, 1, 0] },
                },
                banned: {
                  $sum: { $cond: [{ $eq: ["$banned", true] }, 1, 0] },
                },
                associations: {
                  $sum: {
                    $cond: [{ $eq: ["$legalForm", "association"] }, 1, 0],
                  },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ];

    const agg = await Establishment.aggregate(pipeline).option({
      maxTimeMS: 25000,
    });
    const block = agg?.[0] || {};

    const rawItems = block.items || [];
    const companies = rawItems.map(mapToFrontShape);

    const total = block.total?.[0]?.count ?? 0;
    const stats = block.stats?.[0] ?? {
      total: 0,
      activated: 0,
      banned: 0,
      associations: 0,
    };

    return res.status(200).json({
      companies,
      stats,
      scope: { departments },
      filters: { q, form, status },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to load companies",
      details: error?.message || error,
    });
  }
};

/* =========================
   DETAILS (pour voir docs entreprise + gérant)
   GET /companiesControl/companies/:id
========================= */

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const company = await Establishment.findById(id)
      .populate({
        path: "owner",
        model: Owner,
        // ⚠️ on expose UNIQUEMENT ce qui est utile au back-office
        select: "email account picture cni isValidated isVerified createdAt",
      })
      .lean();

    if (!company) return res.status(404).json({ error: "Not found" });

    return res.status(200).json({ company: mapToFrontShape(company) });
  } catch (e: any) {
    return res.status(500).json({ error: "Failed", details: e?.message || e });
  }
};

/* =========================
   VALIDATE (valider / refuser inscription)
   PATCH /companiesControl/companies/:id/validate
   body: { accepted: boolean, reason?: string }
========================= */

export const validateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const { accepted, reason } = req.body as {
      accepted: boolean;
      reason?: string;
    };

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }

    // règle métier proposée:
    // - accepted => activated true / banned false
    // - refused  => activated false / banned true (bloque)
    const patch: any = accepted
      ? { activated: true, banned: false }
      : { activated: false, banned: true };

    // si tu veux garder reason dans DB, ajoute un champ establishment.validation
    // patch.validation = { status: accepted ? "accepted" : "refused", reason, date: new Date() };

    const updated = await Establishment.findByIdAndUpdate(id, patch, {
      new: true,
    })
      .populate({
        path: "owner",
        model: Owner,
        select:
          "email account.name account.firstname picture cni isValidated isVerified",
      })
      .lean();

    if (!updated) return res.status(404).json({ error: "Not found" });

    return res.status(200).json({
      ok: true,
      company: mapToFrontShape(updated),
      reason: reason || "",
    });
  } catch (e: any) {
    return res.status(500).json({ error: "Failed", details: e?.message || e });
  }
};

/* =========================
   ACTIONS (tes endpoints existants)
========================= */

async function updateById(id: string, patch: any) {
  return Establishment.findByIdAndUpdate(id, patch, { new: true })
    .populate({
      path: "owner",
      model: Owner,
      select: "email account.name account.firstname",
    })
    .lean();
}

export const banCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const updated = await updateById(id, { banned: true, activated: false });
    if (!updated) return res.status(404).json({ error: "Not found" });

    return res
      .status(200)
      .json({ ok: true, company: mapToFrontShape(updated) });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to ban", details: error?.message || error });
  }
};

export const unbanCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const updated = await updateById(id, { banned: false });
    if (!updated) return res.status(404).json({ error: "Not found" });

    return res
      .status(200)
      .json({ ok: true, company: mapToFrontShape(updated) });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to unban", details: error?.message || error });
  }
};

export const activateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const current = await Establishment.findById(id)
      .select("banned activated")
      .lean();
    if (!current) return res.status(404).json({ error: "Not found" });

    if ((current as any)?.banned) {
      return res.status(409).json({ error: "Company is banned. Unban first." });
    }

    const updated = await updateById(id, { activated: true });
    return res
      .status(200)
      .json({ ok: true, company: mapToFrontShape(updated) });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to activate", details: error?.message || error });
  }
};

export const disableCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const updated = await updateById(id, { activated: false });
    if (!updated) return res.status(404).json({ error: "Not found" });

    return res
      .status(200)
      .json({ ok: true, company: mapToFrontShape(updated) });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to disable", details: error?.message || error });
  }
};

/**
 * DELETE /companiesControl/companies/:id
 * Soft delete + blocage si events liés (optionnel)
 */
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const est = await Establishment.findById(id)
      .select("_id owner events")
      .lean();
    if (!est) return res.status(404).json({ error: "Not found" });

    const hasEvents =
      Array.isArray((est as any)?.events) && (est as any).events.length > 0;
    if (hasEvents) {
      return res.status(409).json({
        error:
          "Cannot delete an establishment with events. Disable it or remove events first.",
      });
    }

    await Establishment.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date(), activated: false } },
    );

    if ((est as any)?.owner && isValidId(String((est as any).owner))) {
      await Owner.updateOne(
        { _id: (est as any).owner },
        { $pull: { establishments: (est as any)._id } },
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to delete", details: error?.message || error });
  }
};
