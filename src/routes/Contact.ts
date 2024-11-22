import express from "express";
import controller from "../controllers/Contact";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();

router.post("/create", controller.createContact);
router.get("/get/:contactId", AdminIsAuthenticated, controller.readContact);
router.delete("/delete", AdminIsAuthenticated, controller.deleteContact);

export default router;
