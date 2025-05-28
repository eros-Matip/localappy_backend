import express from "express";
import controller from "../controllers/Event";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";

const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);
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
  cpUpload,
  controller.createEventForAnEstablishment
);

router.post(
  "/createDraft/:establishmentId",
  OwnerIsAuthenticated,
  cpUpload,
  controller.createDraftEvent
);
router.post("/get/:eventId", controller.readEvent);
router.get("/get/", controller.readAll);
router.get("/getAllByZip/:postalCode", controller.getEventsByPostalCode);
router.post("/getAllByLocalisation", controller.getEventsByPosition);
router.post("/getAllByDate/:month", controller.getEventByDate);
router.put("/update/:eventId", OwnerIsAuthenticated, controller.updateEvent);
router.put("/verifAllEvent", AdminIsAuthenticated, controller.verifAllEvent);
router.put("/updateUrl", AdminIsAuthenticated, controller.updateImageUrls);
router.post(
  "/registrationToAnEvent/:eventId",
  controller.registrationToAnEvent
);
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
router.put(
  "/updateDescriptionsAndPrices",
  AdminIsAuthenticated,
  controller.updateDescriptionsAndPrices
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
// router.put("/migrateData", AdminIsAuthenticated, controller.migrateData);

router.delete(
  "/removeExpiredEvents",
  AdminIsAuthenticated,
  controller.removeExpiredEvents
);

router.delete(
  "/deleteInvalidEvents",
  AdminIsAuthenticated,
  controller.deleteInvalidEvents
);

export default router;
