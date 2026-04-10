"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const LoyaltyController_1 = __importDefault(require("../controllers/LoyaltyController"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
router.post("/programs", OwnerIsAuthenticated_1.default, LoyaltyController_1.default.createLoyaltyProgram);
router.patch("/programs/:programId", OwnerIsAuthenticated_1.default, LoyaltyController_1.default.updateLoyaltyProgram);
router.delete("/programs/:programId", OwnerIsAuthenticated_1.default, LoyaltyController_1.default.deleteLoyaltyProgram);
router.get("/programs/:establishmentId", LoyaltyController_1.default.getEstablishmentLoyaltyPrograms);
router.get("/my-cards", IsAuthenticated_1.default, LoyaltyController_1.default.getMyLoyaltyCards);
router.get("/establishments/:establishmentId/my-card", IsAuthenticated_1.default, LoyaltyController_1.default.getMyLoyaltyCardByEstablishment);
router.post("/scan", OwnerIsAuthenticated_1.default, LoyaltyController_1.default.scanLoyaltyCard);
router.post("/redeem", OwnerIsAuthenticated_1.default, LoyaltyController_1.default.redeemLoyaltyReward);
router.get("/establishments/:establishmentId/stats", OwnerIsAuthenticated_1.default, LoyaltyController_1.default.getLoyaltyStatsByEstablishment);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG95YWx0eUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0xveWFsdHlDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHlGQUFpRTtBQUNqRSwrRkFBdUU7QUFDdkUscUZBQXFFO0FBRXJFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFPaEMsTUFBTSxDQUFDLElBQUksQ0FDVCxXQUFXLEVBQ1gsOEJBQW9CLEVBQ3BCLDJCQUFpQixDQUFDLG9CQUFvQixDQUN2QyxDQUFDO0FBR0YsTUFBTSxDQUFDLEtBQUssQ0FDVixzQkFBc0IsRUFDdEIsOEJBQW9CLEVBQ3BCLDJCQUFpQixDQUFDLG9CQUFvQixDQUN2QyxDQUFDO0FBR0YsTUFBTSxDQUFDLE1BQU0sQ0FDWCxzQkFBc0IsRUFDdEIsOEJBQW9CLEVBQ3BCLDJCQUFpQixDQUFDLG9CQUFvQixDQUN2QyxDQUFDO0FBR0YsTUFBTSxDQUFDLEdBQUcsQ0FDUiw0QkFBNEIsRUFDNUIsMkJBQWlCLENBQUMsK0JBQStCLENBQ2xELENBQUM7QUFPRixNQUFNLENBQUMsR0FBRyxDQUNSLFdBQVcsRUFDWCx5QkFBdUIsRUFDdkIsMkJBQWlCLENBQUMsaUJBQWlCLENBQ3BDLENBQUM7QUFHRixNQUFNLENBQUMsR0FBRyxDQUNSLDBDQUEwQyxFQUMxQyx5QkFBdUIsRUFDdkIsMkJBQWlCLENBQUMsK0JBQStCLENBQ2xELENBQUM7QUFPRixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSw4QkFBb0IsRUFBRSwyQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUc5RSxNQUFNLENBQUMsSUFBSSxDQUNULFNBQVMsRUFDVCw4QkFBb0IsRUFDcEIsMkJBQWlCLENBQUMsbUJBQW1CLENBQ3RDLENBQUM7QUFPRixNQUFNLENBQUMsR0FBRyxDQUNSLHdDQUF3QyxFQUN4Qyw4QkFBb0IsRUFDcEIsMkJBQWlCLENBQUMsOEJBQThCLENBQ2pELENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMifQ==