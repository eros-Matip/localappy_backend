import express from "express";
import controller from "../controllers/Owner";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";

const router = express.Router();

/**
 * DASHBOARD "GÉRANTS" (ADMIN)
 * Base path recommandé: /ownersControl
 */

// ✅ Listing + stats + filtres/pagination
router.get("/owners", AdminIsAuthenticated, controller.getOwnersForAdmin);

// ✅ Détails d’un gérant (modal)
router.get(
  "/owners/:ownerId",
  AdminIsAuthenticated,
  controller.getOwnerDetailsForAdmin,
);

// ✅ Actions admin ciblées (pas d’update générique)
router.patch(
  "/owners/:ownerId/set-validated",
  AdminIsAuthenticated,
  controller.setOwnerValidatedForAdmin,
);
router.patch(
  "/owners/:ownerId/set-verified",
  AdminIsAuthenticated,
  controller.setOwnerVerifiedForAdmin,
);
router.patch(
  "/owners/:ownerId/reset-attempts",
  AdminIsAuthenticated,
  controller.resetOwnerAttemptsForAdmin,
);
router.patch(
  "/owners/:ownerId/reset-password-losted",
  AdminIsAuthenticated,
  controller.resetOwnerPasswordLostedForAdmin,
);

// ✅ Gestion du lien Owner ↔ Establishment
router.patch(
  "/owners/:ownerId/link-establishment",
  AdminIsAuthenticated,
  controller.linkOwnerToEstablishmentForAdmin,
);
router.patch(
  "/owners/:ownerId/unlink-establishment",
  AdminIsAuthenticated,
  controller.unlinkOwnerFromEstablishmentForAdmin,
);

// ✅ Suppression admin "safe" (détache establishments + customer + cloudinary)
router.delete(
  "/owners/:ownerId",
  AdminIsAuthenticated,
  controller.deleteOwnerForAdmin,
);

export default router;
