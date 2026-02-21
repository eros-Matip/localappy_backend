import express from "express";
import controller from "../controllers/Establishment";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();
const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "photos", maxCount: 10 }]);

router.post(
  "/create",
  OwnerIsAuthenticated,
  cpUpload,
  controller.createEstablishment,
);
// router.post(
//   "/fetchEstablishmentsByJson",
//   AdminIsAuthenticated,
//   controller.fetchEstablishmentsByJson
// );

router.get(
  "/getInformations/:establishmentId",
  OwnerIsAuthenticated,
  controller.getAllInformation,
);

router.get(
  "/getPublicInformation/:establishmentId",
  controller.getPublicInformation,
);
router.get(
  "/getTicketsStatsByEstablishment/:establishmentId",
  OwnerIsAuthenticated,
  controller.getTicketsStatsByEstablishment,
);
router.put(
  "/update/:establishmentId",
  OwnerIsAuthenticated,
  cpUpload,
  controller.updateEstablishment,
);
/** ✅ AJOUT : upload doc légal */
router.post(
  "/upload-legal-doc/:establishmentId",
  cpUpload,
  OwnerIsAuthenticated,
  controller.uploadLegalDoc,
);

router.post(
  "/request-activation/:establishmentId",
  AdminIsAuthenticated,
  controller.requestActivation,
);
router.post(
  "/establishment/approve-activation/:establishmentId",
  AdminIsAuthenticated,
  controller.approveActivation,
);

router.post(
  "/establishment/reject-activation/:establishmentId",
  AdminIsAuthenticated,
  controller.rejectActivation,
);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteEstablishment);

export default router;
