import express from "express";
import controller from "../controllers/Admin";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();

router.post("/create", AdminIsAuthenticated, controller.createAdmin);
router.put("/update/:adminId", AdminIsAuthenticated, controller.updateAdmin);
router.delete("/delete", AdminIsAuthenticated, controller.deleteAdmin);

export default router;
