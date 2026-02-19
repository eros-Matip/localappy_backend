import { Router } from "express";
import {
  listCompanies,
  banCompany,
  unbanCompany,
  activateCompany,
  disableCompany,
  deleteCompany,
  getCompanyById,
} from "../controllers/AdminCompaniesControl";

const router = Router();

// ✅ compatibles avec ton front (qui n’envoie pas q/form/status à l’API pour l’instant)
// Mais tu peux les ajouter plus tard sans casser.
router.get("/companies", listCompanies);
router.get("/companies/:id", getCompanyById);
router.patch("/companies/:id/ban", banCompany);
router.patch("/companies/:id/unban", unbanCompany);
router.patch("/companies/:id/activate", activateCompany);
router.patch("/companies/:id/disable", disableCompany);
router.delete("/companies/:id", deleteCompany);

export default router;
