import express from "express";
import controller from "../controllers/Registration";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

router.get(
  "/get/:registrationId",
  CustomerIsAuthenticated,
  controller.readRegistration
);
router.get("/get/", CustomerIsAuthenticated, controller.readAll);
router.put(
  "/update/:registrationId",
  CustomerIsAuthenticated,
  controller.updateRegistration
);
router.delete(
  "/delete",
  CustomerIsAuthenticated,
  controller.deleteRegistration
);

export default router;
