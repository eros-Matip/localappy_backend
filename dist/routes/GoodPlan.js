"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const goodPlan_1 = __importDefault(require("../controllers/goodPlan"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
router.get("/", IsAuthenticated_1.default, goodPlan_1.default.getPublicGoodPlans);
router.post("/position", IsAuthenticated_1.default, goodPlan_1.default.getGoodPlansByPosition);
router.post("/scan", IsAuthenticated_1.default, goodPlan_1.default.scanGoodPlanQr);
router.get("/establishment/:establishmentId", IsAuthenticated_1.default, goodPlan_1.default.getGoodPlansForAnEstablishmentPublic);
router.post("/:goodPlanId/read", IsAuthenticated_1.default, goodPlan_1.default.readGoodPlan);
router.post("/:goodPlanId/qr", IsAuthenticated_1.default, goodPlan_1.default.generateGoodPlanQr);
router.post("/establishment/:establishmentId/draft", OwnerIsAuthenticated_1.default, goodPlan_1.default.createGoodPlanForAnEstablishment);
router.post("/owner/establishment/:establishmentId", OwnerIsAuthenticated_1.default, goodPlan_1.default.getGoodPlansForAnEstablishmentOwner);
router.patch("/:goodPlanId", OwnerIsAuthenticated_1.default, goodPlan_1.default.updateGoodPlan);
router.patch("/:goodPlanId/publish", OwnerIsAuthenticated_1.default, goodPlan_1.default.publishGoodPlan);
router.patch("/:goodPlanId/disable", OwnerIsAuthenticated_1.default, goodPlan_1.default.disableGoodPlan);
router.delete("/:goodPlanId", OwnerIsAuthenticated_1.default, goodPlan_1.default.deleteGoodPlan);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR29vZFBsYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0dvb2RQbGFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUF5RDtBQUN6RCwrRkFBdUU7QUFDdkUscUZBQXFFO0FBRXJFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFRaEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUseUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUdoRixNQUFNLENBQUMsSUFBSSxDQUNULFdBQVcsRUFDWCx5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsc0JBQXNCLENBQzFDLENBQUM7QUFHRixNQUFNLENBQUMsSUFBSSxDQUNULE9BQU8sRUFDUCx5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsY0FBYyxDQUNsQyxDQUFDO0FBR0YsTUFBTSxDQUFDLEdBQUcsQ0FDUixpQ0FBaUMsRUFDakMseUJBQXVCLEVBQ3ZCLGtCQUFrQixDQUFDLG9DQUFvQyxDQUN4RCxDQUFDO0FBR0YsTUFBTSxDQUFDLElBQUksQ0FDVCxtQkFBbUIsRUFDbkIseUJBQXVCLEVBQ3ZCLGtCQUFrQixDQUFDLFlBQVksQ0FDaEMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsaUJBQWlCLEVBQ2pCLHlCQUF1QixFQUN2QixrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FDdEMsQ0FBQztBQWNGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsdUNBQXVDLEVBQ3ZDLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxnQ0FBZ0MsQ0FDcEQsQ0FBQztBQUdGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsdUNBQXVDLEVBQ3ZDLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxtQ0FBbUMsQ0FDdkQsQ0FBQztBQUdGLE1BQU0sQ0FBQyxLQUFLLENBQ1YsY0FBYyxFQUNkLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxjQUFjLENBQ2xDLENBQUM7QUFHRixNQUFNLENBQUMsS0FBSyxDQUNWLHNCQUFzQixFQUN0Qiw4QkFBb0IsRUFDcEIsa0JBQWtCLENBQUMsZUFBZSxDQUNuQyxDQUFDO0FBR0YsTUFBTSxDQUFDLEtBQUssQ0FDVixzQkFBc0IsRUFDdEIsOEJBQW9CLEVBQ3BCLGtCQUFrQixDQUFDLGVBQWUsQ0FDbkMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxNQUFNLENBQ1gsY0FBYyxFQUNkLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxjQUFjLENBQ2xDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMifQ==