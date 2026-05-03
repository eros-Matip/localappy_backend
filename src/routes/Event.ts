import express, { NextFunction, Request, Response } from "express";
import controller from "../controllers/goodPlan";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

const preserveAuthenticatedCustomer = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  (req as any).customer = req.body?.admin || null;
  next();
};

const preserveAuthenticatedOwner = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  (req as any).owner = req.body?.owner || null;
  next();
};

/**
 * CUSTOMER
 * Routes accessibles aux utilisateurs connectés.
 */

// Récupérer les bons plans visibles pour les utilisateurs
router.get(
  "/",
  CustomerIsAuthenticated,
  preserveAuthenticatedCustomer,
  controller.getPublicGoodPlans,
);

// Récupérer les bons plans autour d'une position
router.post(
  "/position",
  CustomerIsAuthenticated,
  preserveAuthenticatedCustomer,
  controller.getGoodPlansByPosition,
);

// Récupérer les bons plans visibles d'un établissement
router.get(
  "/establishment/:establishmentId",
  CustomerIsAuthenticated,
  preserveAuthenticatedCustomer,
  controller.getGoodPlansForAnEstablishmentPublic,
);

// Lire un bon plan + tracker une vue
router.post(
  "/:goodPlanId/read",
  CustomerIsAuthenticated,
  preserveAuthenticatedCustomer,
  controller.readGoodPlan,
);

// Déclarer une utilisation d'un bon plan
router.post(
  "/:goodPlanId/use",
  CustomerIsAuthenticated,
  preserveAuthenticatedCustomer,
  controller.declareGoodPlanUse,
);

/**
 * OWNER
 * Routes de gestion des bons plans d'un établissement.
 */

// Créer un bon plan pour un établissement
router.post(
  "/establishment/:establishmentId/draft",
  OwnerIsAuthenticated,
  preserveAuthenticatedOwner,
  controller.createGoodPlanForAnEstablishment,
);

// Récupérer tous les bons plans d'un établissement côté owner
router.post(
  "/owner/establishment/:establishmentId",
  OwnerIsAuthenticated,
  preserveAuthenticatedOwner,
  controller.getGoodPlansForAnEstablishmentOwner,
);

// Modifier un bon plan
router.patch(
  "/:goodPlanId",
  OwnerIsAuthenticated,
  preserveAuthenticatedOwner,
  controller.updateGoodPlan,
);

// Publier un bon plan
router.patch(
  "/:goodPlanId/publish",
  OwnerIsAuthenticated,
  preserveAuthenticatedOwner,
  controller.publishGoodPlan,
);

// Désactiver un bon plan
router.patch(
  "/:goodPlanId/disable",
  OwnerIsAuthenticated,
  preserveAuthenticatedOwner,
  controller.disableGoodPlan,
);

// Supprimer logiquement un bon plan
router.delete(
  "/:goodPlanId",
  OwnerIsAuthenticated,
  preserveAuthenticatedOwner,
  controller.deleteGoodPlan,
);

export default router;
