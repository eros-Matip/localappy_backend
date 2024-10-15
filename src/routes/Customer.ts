import express from "express";
import controller from "../controllers/Customer";

const router = express.Router();

router.post("/create", controller.createCustomer);
router.get("/get/:customerId", controller.readCustomer);
router.get("/get/", controller.readAll);
router.put("/update/:customerId", controller.updateCustomer);
router.delete("/delete", controller.deleteCustomer);

export default router;
