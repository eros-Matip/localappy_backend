import express from "express";
import controller from "../controllers/Event";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

const router = express.Router();

router.post(
  "/createForAnEstablishment/:establishmentId",
  OwnerIsAuthenticated,
  controller.createEventForAnEstablishment
);
router.get("/get/:eventId", controller.readEvent);
router.get("/get/", controller.readAll);
router.get("/getAllByZip/:postalCode", controller.getEventsByPostalCode);
router.post("/getAllByLocalisation", controller.getEventsByPosition);
router.put("/update/:eventId", OwnerIsAuthenticated, controller.updateEvent);
router.delete("/delete/:eventId", OwnerIsAuthenticated, controller.deleteEvent);
router.delete("/deleteDuplicateEvents", controller.deleteDuplicateEvents);
export default router;
