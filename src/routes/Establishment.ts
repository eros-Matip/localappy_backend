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
  cpUpload,
  OwnerIsAuthenticated,
  controller.createEstablishment
);
// router.post(
//   "/fetchEstablishmentsByJson",
//   AdminIsAuthenticated,
//   controller.fetchEstablishmentsByJson
// );

router.get(
  "/getInformations/:establishmentId",
  OwnerIsAuthenticated,
  controller.getAllInformation
);
router.put(
  "/update/:establishmentId",
  cpUpload,
  OwnerIsAuthenticated,
  controller.updateEstablishment
);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteEstablishment);

export default router;
