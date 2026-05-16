import express, { NextFunction, Request, Response } from "express";
import controller from "../controllers/Event";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

import EventPresenceController from "../controllers/EventPresence";
import EventLivePhotoController from "../controllers/EventLivePhoto";

import multer from "multer";
import { multerConfig } from "../middlewares/Multer";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);

const router = express.Router();

const preserveAuthenticatedCustomer = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  (req as any).customer = req.body?.admin || null;
  next();
};

const preserveAuthenticatedOwner = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  (req as any).owner = req.body?.owner || null;
  next();
};

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
  controller.createEventForAnEstablishment,
);

router.post(
  "/createDraft/:establishmentId",
  OwnerIsAuthenticated,
  cpUpload,
  controller.createDraftEvent,
);
router.post("/get/:eventId", controller.readEvent);
router.get("/getAll/", controller.readAll);
router.get("/getAllByZip/:postalCode", controller.getEventsByPostalCode);
router.post("/getAllByLocalisation", controller.getEventsByPosition);
router.post("/getAllByDate/:month", controller.getEventByDate);
router.put("/update/:eventId", OwnerIsAuthenticated, controller.updateEvent);
router.put("/verifAllEvent", AdminIsAuthenticated, controller.verifAllEvent);
router.put("/updateUrl", AdminIsAuthenticated, controller.updateImageUrls);
router.post("/canScan", CustomerIsAuthenticated, controller.canScan);
router.post("/scan", controller.scanATicketForAnEvent);
router.post(
  "/registrationToAnEvent/:eventId",
  CustomerIsAuthenticated,
  controller.registrationToAnEvent,
);
// router.put(
//   "/updateEventCoordinates",
//   AdminIsAuthenticated,
//   controller.updateEventCoordinates
// );
router.put(
  "/getCoordinatesFromAPI",
  AdminIsAuthenticated,
  controller.getCoordinatesFromAPI,
);
router.put(
  "/updateDescriptionsAndPrices",
  AdminIsAuthenticated,
  controller.updateDescriptionsAndPrices,
);
router.delete("/delete/:eventId", OwnerIsAuthenticated, controller.deleteEvent);
router.delete(
  "/deleteDuplicateEvents",
  AdminIsAuthenticated,
  controller.deleteDuplicateEvents,
);

router.delete(
  "/removeMidnightDates",
  AdminIsAuthenticated,
  controller.removeMidnightDates,
);
// router.put("/migrateData", AdminIsAuthenticated, controller.migrateData);

router.delete(
  "/removeExpiredEvents",
  AdminIsAuthenticated,
  controller.removeExpiredEvents,
);

router.delete(
  "/deleteInvalidEvents",
  AdminIsAuthenticated,
  controller.deleteInvalidEvents,
);

router.post(
  "/presence/join/:eventId",
  CustomerIsAuthenticated,
  EventPresenceController.joinPresence,
);

router.patch(
  "/presence/ping/:eventId",
  CustomerIsAuthenticated,
  EventPresenceController.pingPresence,
);

router.post(
  "/presence/leave/:eventId",
  CustomerIsAuthenticated,
  EventPresenceController.leavePresence,
);

router.get(
  "/presence/me/:eventId",
  CustomerIsAuthenticated,
  EventPresenceController.getMyPresence,
);

router.post(
  "/live-photos/:eventId",
  CustomerIsAuthenticated,
  preserveAuthenticatedCustomer,
  cpUpload,
  EventLivePhotoController.uploadLivePhoto,
);

router.get(
  "/live-photos/:eventId",
  CustomerIsAuthenticated,
  EventLivePhotoController.getLivePhotos,
);

router.delete(
  "/live-photos/:eventId/:photoId",
  CustomerIsAuthenticated,
  EventLivePhotoController.deleteLivePhoto,
);

router.patch(
  "/live-photos/:eventId/:photoId/moderate",
  OwnerIsAuthenticated,
  EventLivePhotoController.moderateLivePhoto,
);
router.post(
  "/getAllForEventScreen",
  CustomerIsAuthenticated,
  controller.getEventsForEventScreen,
);
router.get("/live/:eventId", CustomerIsAuthenticated, controller.getLiveEvent);

export default router;
