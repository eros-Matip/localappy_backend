import express from "express";
import controller from "../controllers/Ads";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

const router = express.Router();
const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);

router.post(
  "/create/:establishmentId",
  cpUpload,
  OwnerIsAuthenticated,
  controller.createAd
);
router.get("/get/:adId", controller.getAdById);
router.get("/get/", controller.getAds);
router.put(
  "/update/:adId",
  cpUpload,
  OwnerIsAuthenticated,
  controller.updateAd
);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteAd);

export default router;
