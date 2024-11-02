import express from "express";
import controller from "../controllers/Customer";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";

const router = express.Router();

const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 1 }]);

router.post("/create", controller.createCustomer);
router.get("/get/:customerId", AdminIsAuthenticated, controller.readCustomer);
router.get("/get/", AdminIsAuthenticated, controller.readAll);
router.put(
  "/update/:customerId",
  AdminIsAuthenticated,
  cpUpload,
  controller.updateCustomer
);
router.put(
  "/addingOrRemoveFavorites",
  AdminIsAuthenticated,
  controller.addingOrRemoveFavorites
);
router.delete("/delete", AdminIsAuthenticated, controller.deleteCustomer);

export default router;
