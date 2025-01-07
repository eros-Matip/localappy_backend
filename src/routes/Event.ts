import express from "express";
import controller from "../controllers/Event";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();
// router.post("/create/", controller.createEventFromJSON);
// router.post(
//   "/updateOrCreateEventFromJSON",
//   controller.updateOrCreateEventFromJSON
// );
// router.post("/updateEventForParis", controller.updateEventForParis);
router.post(
  "/createForAnEstablishment/:establishmentId",
  OwnerIsAuthenticated,
  controller.createEventForAnEstablishment
);
router.get("/get/:eventId", controller.readEvent);
router.get("/get/", controller.readAll);
router.get("/getAllByZip/:postalCode", controller.getEventsByPostalCode);
router.post("/getAllByLocalisation", controller.getEventsByPosition);
router.post("/getAllByDate/:month", controller.getEventByDate);
router.put("/update/:eventId", OwnerIsAuthenticated, controller.updateEvent);
router.put("/verifAllEvent", AdminIsAuthenticated, controller.verifAllEvent);
router.put("/updateUrl", AdminIsAuthenticated, controller.updateImageUrls);
// router.put(
//   "/updateEventCoordinates",
//   AdminIsAuthenticated,
//   controller.updateEventCoordinates
// );
router.put(
  "/getCoordinatesFromAPI",
  AdminIsAuthenticated,
  controller.getCoordinatesFromAPI
);
router.delete("/delete/:eventId", AdminIsAuthenticated, controller.deleteEvent);
router.delete(
  "/deleteDuplicateEvents",
  AdminIsAuthenticated,
  controller.deleteDuplicateEvents
);
router.delete(
  "/removeMidnightDates",
  AdminIsAuthenticated,
  controller.removeMidnightDates
);
router.delete(
  "/removeExpiredEvents",
  AdminIsAuthenticated,
  controller.removeExpiredEvents
);

export default router;
