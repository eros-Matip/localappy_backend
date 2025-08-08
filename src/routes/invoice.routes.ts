import { Router } from "express";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

const router = Router();

router.get("/invoice/:registrationId", generateInvoicePdf);

export default router;
