import express from "express";
import GoodPlanController from "../controllers/goodPlan";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

/**
 * CUSTOMER
 * Routes accessibles aux utilisateurs connectés.
 */

// Récupérer les bons plans visibles
router.get("/", CustomerIsAuthenticated, GoodPlanController.getPublicGoodPlans);

// Récupérer les bons plans autour d'une position
router.post(
  "/position",
  CustomerIsAuthenticated,
  GoodPlanController.getGoodPlansByPosition,
);

// Scanner un QR code de bon plan côté commerçant / staff
router.post(
  "/scan",
  CustomerIsAuthenticated,
  GoodPlanController.scanGoodPlanQr,
);

// Récupérer les bons plans visibles d'un établissement
router.get(
  "/establishment/:establishmentId",
  CustomerIsAuthenticated,
  GoodPlanController.getGoodPlansForAnEstablishmentPublic,
);

// Lire un bon plan + tracker une vue
router.post(
  "/:goodPlanId/read",
  CustomerIsAuthenticated,
  GoodPlanController.readGoodPlan,
);

// Générer le QR code client pour utiliser un bon plan
router.post(
  "/:goodPlanId/qr",
  CustomerIsAuthenticated,
  GoodPlanController.generateGoodPlanQr,
);

// Ancien système à éviter : le client ne doit pas valider seul une utilisation.
// router.post(
//   "/:goodPlanId/use",
//   CustomerIsAuthenticated,
//   GoodPlanController.declareGoodPlanUse,
// );

/**
 * OWNER / GESTION ÉTABLISSEMENT
 */

// Créer un bon plan pour un établissement
router.post(
  "/establishment/:establishmentId/draft",
  OwnerIsAuthenticated,
  GoodPlanController.createGoodPlanForAnEstablishment,
);

// Récupérer tous les bons plans d'un établissement côté owner
router.post(
  "/owner/establishment/:establishmentId",
  OwnerIsAuthenticated,
  GoodPlanController.getGoodPlansForAnEstablishmentOwner,
);

// Modifier un bon plan
router.patch(
  "/:goodPlanId",
  OwnerIsAuthenticated,
  GoodPlanController.updateGoodPlan,
);

// Publier un bon plan
router.patch(
  "/:goodPlanId/publish",
  OwnerIsAuthenticated,
  GoodPlanController.publishGoodPlan,
);

// Désactiver un bon plan
router.patch(
  "/:goodPlanId/disable",
  OwnerIsAuthenticated,
  GoodPlanController.disableGoodPlan,
);

// Supprimer logiquement un bon plan
router.delete(
  "/:goodPlanId",
  OwnerIsAuthenticated,
  GoodPlanController.deleteGoodPlan,
);

export default router;
