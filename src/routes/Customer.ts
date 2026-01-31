import express from "express";
import controller from "../controllers/Customer";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";
import multer from "multer";
import { multerConfig } from "../middlewares/Multer";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

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
  controller.updateCustomer,
);
router.put(
  "/addingOrRemoveFavorites",
  AdminIsAuthenticated,
  controller.addingOrRemoveFavorites,
);
// Owner invite un staff
router.post(
  "/inviteStaff/:establishmentId",
  OwnerIsAuthenticated,
  controller.inviteStaff,
);

// Customer répond à une invitation
router.put(
  "/respondToStaffInvitation/:invitationId",
  CustomerIsAuthenticated,
  controller.respondToStaffInvitation,
);
router.delete("/delete", AdminIsAuthenticated, controller.deleteCustomer);

export default router;
