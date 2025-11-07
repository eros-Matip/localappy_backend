import express from "express";
import controller from "../controllers/Customer";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";

const router = express.Router();

const upload = multer(multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);

router.post("/create", controller.createCustomer);
router.get("/get/:customerId", controller.readCustomer);
router.get("/get/", controller.readAll);
router.put(
  "/update/:customerId",
  AdminIsAuthenticated,
  cpUpload,
  controller.updateCustomer
);
router.post(
  "/inviteStaff/:establishmentId",
  OwnerIsAuthenticated,
  controller.inviteStaff
);
router.post(
  "/respondToStaffInvitation/:invitationId",
  controller.respondToStaffInvitation
);

router.put(
  "/addingOrRemoveFavorites",
  AdminIsAuthenticated,
  controller.addingOrRemoveFavorites
);
router.delete("/delete", AdminIsAuthenticated, controller.deleteCustomer);

export default router;
