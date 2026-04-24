import { Router } from "express";
import { newCustomersPerDay } from "../controllers/AdminUsersControl";

import {
  getLoginStats,
  getCityConsultationStats,
  getTopCities,
  getQrScanStats,
  getDashboardStats,
  getTopScannedEstablishments,
} from "../controllers/adminStatsControl";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = Router();

/* =========================
   USER STATS
========================= */

router.get(
  "/admin/stats/new-customers-per-day",
  AdminIsAuthenticated,
  newCustomersPerDay,
);

/* =========================
   PLATFORM / DASHBOARD STATS
========================= */

router.get("/admin/stats/logins", AdminIsAuthenticated, getLoginStats);
router.get(
  "/admin/stats/city-consultations",
  AdminIsAuthenticated,
  getCityConsultationStats,
);
router.get("/admin/stats/top-cities", AdminIsAuthenticated, getTopCities);
router.get("/admin/stats/qr-scans", AdminIsAuthenticated, getQrScanStats);
router.get(
  "/admin/stats/top-scanned-establishments",
  AdminIsAuthenticated,
  getTopScannedEstablishments,
);
router.get("/admin/stats/dashboard", AdminIsAuthenticated, getDashboardStats);

export default router;
