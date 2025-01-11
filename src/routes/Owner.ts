import express from "express";
import controller from "../controllers/Owner";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";

const router = express.Router();
const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 1 }]);

router.post("/create", AdminIsAuthenticated, cpUpload, controller.createOwner);
router.get("/get/:ownerId", OwnerIsAuthenticated, controller.getOwnerById);
router.put("/update/:ownerId", OwnerIsAuthenticated, controller.updateOwner);
router.delete("/delete", OwnerIsAuthenticated, controller.deleteOwner);

export default router;
