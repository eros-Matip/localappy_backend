import express from "express";
import controller from "../controllers/Tools";

const router = express.Router();

router.post(
  "/generateDescription",
  controller.generateEventDescriptionController
);

router.post("/translate", controller.translateController);

export default router;
