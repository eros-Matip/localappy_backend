import express from "express";
import controller from "../controllers/Establishment";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

const router = express.Router();

router.post("/create", OwnerIsAuthenticated, controller.createEstablishment);
router.get("/get/:establishmentId", controller.getEstablishmentById);
router.put(
  "/update/:establishmentId",
  OwnerIsAuthenticated,
  controller.updateEstablishment
);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteEstablishment);

export default router;
