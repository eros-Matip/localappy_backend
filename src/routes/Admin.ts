import express from "express";
import controller from "../controllers/Admin";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();

router.post("/create", AdminIsAuthenticated, controller.createAdmin);
router.get("/dashboard", AdminIsAuthenticated, controller.dashboard);
router.get("/dashboard/summary", AdminIsAuthenticated, controller.summary);
router.get(
  "/dashboard/distribution",
  AdminIsAuthenticated,
  controller.distribution,
);
router.get(
  "/dashboard/recentActivity",
  AdminIsAuthenticated,
  controller.recentActivity,
);
router.get(
  "/dashboard/topEstablishments",
  AdminIsAuthenticated,
  controller.topEstablishments,
);
router.get(
  "/dashboard/customersDashboard",
  AdminIsAuthenticated,
  controller.customersDashboard,
);
router.get(
  "/dashboard/adsDashboard",
  AdminIsAuthenticated,
  controller.adsDashboard,
);

router.put("/update/:adminId", AdminIsAuthenticated, controller.updateAdmin);
router.delete("/delete", AdminIsAuthenticated, controller.deleteAdmin);

export default router;
