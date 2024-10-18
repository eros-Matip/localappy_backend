import express from "express";
import controller from "../controllers/Customer";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

router.post("/create", controller.createCustomer);
router.get("/get/:customerId", AdminIsAuthenticated, controller.readCustomer);
router.get("/get/", AdminIsAuthenticated, controller.readAll);
router.put(
  "/update/:customerId",
  AdminIsAuthenticated,
  controller.updateCustomer
);
router.delete("/delete", AdminIsAuthenticated, controller.deleteCustomer);

export default router;
