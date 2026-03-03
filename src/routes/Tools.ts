import express from "express";
import controller from "../controllers/Tools";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

const router = express.Router();

router.post(
  "/generateDescription",
  controller.generateEventDescriptionController,
);

router.post(
  "/customer/generate-descriptif",
  CustomerIsAuthenticated,
  controller.generateCustomerDescriptifFromThemesController,
);

router.post("/translate", controller.translateController);

router.post(
  "/tools/establishment/translate-descriptif",
  OwnerIsAuthenticated,
  controller.translateEstablishmentDescriptionController,
);

router.post(
  "/tools/establishment/generate-descriptif",
  OwnerIsAuthenticated,
  controller.generateEstablishmentDescriptionFromTypesController,
);

export default router;
