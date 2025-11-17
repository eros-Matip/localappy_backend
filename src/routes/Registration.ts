import express from "express";
import controller from "../controllers/Registration";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

router.get(
  "/getAllByEstablishment/:establishmentId",
  CustomerIsAuthenticated,
  controller.readRegistrationByEstablishment
);
router.get(
  "/getAllByCustomer/",
  CustomerIsAuthenticated,
  controller.getUserReservationsGroupedByDate
);
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
