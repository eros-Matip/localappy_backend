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
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = Router();

// ✅ compatibles avec ton front (qui n’envoie pas q/form/status à l’API pour l’instant)
// Mais tu peux les ajouter plus tard sans casser.
router.get("/companies", AdminIsAuthenticated, listCompanies);
router.get("/companies/:id", AdminIsAuthenticated, getCompanyById);
router.patch("/companies/:id/ban", AdminIsAuthenticated, banCompany);
router.patch("/companies/:id/unban", AdminIsAuthenticated, unbanCompany);
router.patch("/companies/:id/activate", AdminIsAuthenticated, activateCompany);
router.patch("/companies/:id/disable", AdminIsAuthenticated, disableCompany);
router.delete("/companies/:id", AdminIsAuthenticated, deleteCompany);

export default router;
