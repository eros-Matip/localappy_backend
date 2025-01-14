import express from "express";
import controller from "../controllers/Establishment";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";

const router = express.Router();
const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 1 }]);

router.post(
  "/create",
  cpUpload,
  OwnerIsAuthenticated,
  controller.createEstablishment
);
router.get("/get/:establishmentId", controller.getEstablishmentById);
router.put(
  "/update/:establishmentId",
  OwnerIsAuthenticated,
  controller.updateEstablishment
);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteEstablishment);

export default router;
