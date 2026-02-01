import express from "express";
import controller from "../controllers/Tools";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

router.post(
  "/generateDescription",
  controller.generateEventDescriptionController,
);

router.post("/translate", controller.translateController);

router.post(
  "/customer/generate-descriptif",
  CustomerIsAuthenticated,
  controller.generateCustomerDescriptifFromThemesController,
);

export default router;
