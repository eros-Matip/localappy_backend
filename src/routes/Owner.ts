import express from "express";
import controller from "../controllers/Owner";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

router.post("/create", AdminIsAuthenticated, controller.createOwner);
router.get("/get/:ownerId", OwnerIsAuthenticated, controller.getOwnerById);
router.put("/update/:ownerId", OwnerIsAuthenticated, controller.updateOwner);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteOwner);

export default router;
