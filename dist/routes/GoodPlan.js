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
router.get("/establishment/:establishmentId", IsAuthenticated_1.default, goodPlan_1.default.getGoodPlansForAnEstablishmentPublic);
router.post("/:goodPlanId/read", IsAuthenticated_1.default, goodPlan_1.default.readGoodPlan);
router.post("/:goodPlanId/use", IsAuthenticated_1.default, goodPlan_1.default.declareGoodPlanUse);
router.post("/establishment/:establishmentId/draft", OwnerIsAuthenticated_1.default, goodPlan_1.default.createGoodPlanForAnEstablishment);
router.post("/owner/establishment/:establishmentId", OwnerIsAuthenticated_1.default, goodPlan_1.default.getGoodPlansForAnEstablishmentOwner);
router.patch("/:goodPlanId", OwnerIsAuthenticated_1.default, goodPlan_1.default.updateGoodPlan);
router.patch("/:goodPlanId/publish", OwnerIsAuthenticated_1.default, goodPlan_1.default.publishGoodPlan);
router.patch("/:goodPlanId/disable", OwnerIsAuthenticated_1.default, goodPlan_1.default.disableGoodPlan);
router.delete("/:goodPlanId", OwnerIsAuthenticated_1.default, goodPlan_1.default.deleteGoodPlan);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR29vZFBsYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0dvb2RQbGFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUF5RDtBQUN6RCwrRkFBdUU7QUFDdkUscUZBQXFFO0FBRXJFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFPaEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUseUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUdoRixNQUFNLENBQUMsSUFBSSxDQUNULFdBQVcsRUFDWCx5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsc0JBQXNCLENBQzFDLENBQUM7QUFHRixNQUFNLENBQUMsR0FBRyxDQUNSLGlDQUFpQyxFQUNqQyx5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsb0NBQW9DLENBQ3hELENBQUM7QUFHRixNQUFNLENBQUMsSUFBSSxDQUNULG1CQUFtQixFQUNuQix5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsWUFBWSxDQUNoQyxDQUFDO0FBR0YsTUFBTSxDQUFDLElBQUksQ0FDVCxrQkFBa0IsRUFDbEIseUJBQXVCLEVBQ3ZCLGtCQUFrQixDQUFDLGtCQUFrQixDQUN0QyxDQUFDO0FBT0YsTUFBTSxDQUFDLElBQUksQ0FDVCx1Q0FBdUMsRUFDdkMsOEJBQW9CLEVBQ3BCLGtCQUFrQixDQUFDLGdDQUFnQyxDQUNwRCxDQUFDO0FBR0YsTUFBTSxDQUFDLElBQUksQ0FDVCx1Q0FBdUMsRUFDdkMsOEJBQW9CLEVBQ3BCLGtCQUFrQixDQUFDLG1DQUFtQyxDQUN2RCxDQUFDO0FBSUYsTUFBTSxDQUFDLEtBQUssQ0FDVixjQUFjLEVBQ2QsOEJBQW9CLEVBQ3BCLGtCQUFrQixDQUFDLGNBQWMsQ0FDbEMsQ0FBQztBQUlGLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysc0JBQXNCLEVBQ3RCLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxlQUFlLENBQ25DLENBQUM7QUFHRixNQUFNLENBQUMsS0FBSyxDQUNWLHNCQUFzQixFQUN0Qiw4QkFBb0IsRUFDcEIsa0JBQWtCLENBQUMsZUFBZSxDQUNuQyxDQUFDO0FBR0YsTUFBTSxDQUFDLE1BQU0sQ0FDWCxjQUFjLEVBQ2QsOEJBQW9CLEVBQ3BCLGtCQUFrQixDQUFDLGNBQWMsQ0FDbEMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9