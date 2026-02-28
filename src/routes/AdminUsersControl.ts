import { Router } from "express";
import AdminIsAuthenticated from "../middlewares/AdminIsAuthenticated";
import {
  usersList,
  userBan,
  userUnban,
  userActivate,
  userDisable,
  userSetPremium,
  userDelete,
} from "../controllers/AdminUsersControl";
const router = Router();

// ✅ USERS (pour l’écran UsersDashboardPage)
router.get("/users", AdminIsAuthenticated, usersList);

// actions
router.patch("/users/:userId/ban", AdminIsAuthenticated, userBan);
router.patch("/users/:userId/unban", AdminIsAuthenticated, userUnban);
router.patch("/users/:userId/activate", AdminIsAuthenticated, userActivate);
router.patch("/users/:userId/disable", AdminIsAuthenticated, userDisable);

// premium (ton front envoie { premiumStatus: boolean })
router.patch("/users/:userId/premium", AdminIsAuthenticated, userSetPremium);

// delete
router.delete("/users/:userId", AdminIsAuthenticated, userDelete);

export default router;
