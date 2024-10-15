import express from "express";
import controller from "../controllers/Event";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

const router = express.Router();

router.post("/create", OwnerIsAuthenticated, controller.createEvent);
router.post(
  "/createForAnEstablishment/:establishmentId",
  OwnerIsAuthenticated,
  controller.createEventForAnEstablishment
);
router.get("/get/:eventId", controller.readEvent);
router.get("/get/", controller.readAll);
router.get("/getAllByZip/:postalCode", controller.getEventsByPostalCode);
router.put("/update/:eventId", OwnerIsAuthenticated, controller.updateEvent);
router.put(
  "/updateAllFromJSON/",
  OwnerIsAuthenticated,
  controller.updateOrCreateEventsFromJSON
);
router.delete("/delete/:eventId", OwnerIsAuthenticated, controller.deleteEvent);

export default router;
