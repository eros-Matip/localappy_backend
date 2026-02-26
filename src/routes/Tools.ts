import express from "express";
import controller from "../controllers/Tools";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

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

router.post(
  "/establishment/description/generate",
  OwnerIsAuthenticated,
  controller.generateEstablishmentDescriptionFromTypesController,
);

router.post(
  "/establishment/translate-descriptif",
  OwnerIsAuthenticated,
  controller.translateEstablishmentDescriptionController,
);
export default router;
