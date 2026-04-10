import express from "express";
import LoyaltyController from "../controllers/LoyaltyController";
import OwnerIsAuthenticated from "../middlewares/OwnerIsAuthenticated";
import CustomerIsAuthenticated from "../middlewares/IsAuthenticated";

const router = express.Router();

// =========================
// PROGRAMMES DE FIDÉLITÉ
// =========================

// Créer un programme pour un établissement
router.post(
  "/programs",
  OwnerIsAuthenticated,
  LoyaltyController.createLoyaltyProgram,
);

// Modifier un programme
router.patch(
  "/programs/:programId",
  OwnerIsAuthenticated,
  LoyaltyController.updateLoyaltyProgram,
);

// Supprimer un programme
router.delete(
  "/programs/:programId",
  OwnerIsAuthenticated,
  LoyaltyController.deleteLoyaltyProgram,
);

// Récupérer les programmes d’un établissement
router.get(
  "/programs/:establishmentId",
  LoyaltyController.getEstablishmentLoyaltyPrograms,
);

// =========================
// CARTES CLIENT
// =========================

// Voir toutes mes cartes fidélité
router.get(
  "/my-cards",
  CustomerIsAuthenticated,
  LoyaltyController.getMyLoyaltyCards,
);

// Voir ma carte pour un établissement
router.get(
  "/establishments/:establishmentId/my-card",
  CustomerIsAuthenticated,
  LoyaltyController.getMyLoyaltyCardByEstablishment,
);

// =========================
// ACTIONS COMMERÇANT
// =========================

// Ajouter un tampon
router.post("/scan", OwnerIsAuthenticated, LoyaltyController.scanLoyaltyCard);

// Valider la récompense et repartir à 0
router.post(
  "/redeem",
  OwnerIsAuthenticated,
  LoyaltyController.redeemLoyaltyReward,
);

// =========================
// STATS
// =========================

// Stats fidélité d’un établissement
router.get(
  "/establishments/:establishmentId/stats",
  OwnerIsAuthenticated,
  LoyaltyController.getLoyaltyStatsByEstablishment,
);

export default router;
