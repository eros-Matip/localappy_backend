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
const preserveAuthenticatedCustomer = (req, res, next) => {
    var _a;
    req.customer = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.admin) || null;
    next();
};
const preserveAuthenticatedOwner = (req, res, next) => {
    var _a;
    req.owner = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.owner) || null;
    next();
};
router.get("/", IsAuthenticated_1.default, preserveAuthenticatedCustomer, goodPlan_1.default.getPublicGoodPlans);
router.post("/position", IsAuthenticated_1.default, preserveAuthenticatedCustomer, goodPlan_1.default.getGoodPlansByPosition);
router.get("/establishment/:establishmentId", IsAuthenticated_1.default, preserveAuthenticatedCustomer, goodPlan_1.default.getGoodPlansForAnEstablishmentPublic);
router.post("/:goodPlanId/read", IsAuthenticated_1.default, preserveAuthenticatedCustomer, goodPlan_1.default.readGoodPlan);
router.post("/:goodPlanId/use", IsAuthenticated_1.default, preserveAuthenticatedCustomer, goodPlan_1.default.declareGoodPlanUse);
router.post("/establishment/:establishmentId/draft", OwnerIsAuthenticated_1.default, preserveAuthenticatedOwner, goodPlan_1.default.createGoodPlanForAnEstablishment);
router.post("/owner/establishment/:establishmentId", OwnerIsAuthenticated_1.default, preserveAuthenticatedOwner, goodPlan_1.default.getGoodPlansForAnEstablishmentOwner);
router.patch("/:goodPlanId", OwnerIsAuthenticated_1.default, preserveAuthenticatedOwner, goodPlan_1.default.updateGoodPlan);
router.patch("/:goodPlanId/publish", OwnerIsAuthenticated_1.default, preserveAuthenticatedOwner, goodPlan_1.default.publishGoodPlan);
router.patch("/:goodPlanId/disable", OwnerIsAuthenticated_1.default, preserveAuthenticatedOwner, goodPlan_1.default.disableGoodPlan);
router.delete("/:goodPlanId", OwnerIsAuthenticated_1.default, preserveAuthenticatedOwner, goodPlan_1.default.deleteGoodPlan);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQW1FO0FBQ25FLHVFQUFpRDtBQUNqRCwrRkFBdUU7QUFDdkUscUZBQXFFO0FBRXJFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSw2QkFBNkIsR0FBRyxDQUNwQyxHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7O0lBQ0QsR0FBVyxDQUFDLFFBQVEsR0FBRyxDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksMENBQUUsS0FBSyxLQUFJLElBQUksQ0FBQztJQUNoRCxJQUFJLEVBQUUsQ0FBQztBQUNULENBQUMsQ0FBQztBQUVGLE1BQU0sMEJBQTBCLEdBQUcsQ0FDakMsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFOztJQUNELEdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLDBDQUFFLEtBQUssS0FBSSxJQUFJLENBQUM7SUFDN0MsSUFBSSxFQUFFLENBQUM7QUFDVCxDQUFDLENBQUM7QUFRRixNQUFNLENBQUMsR0FBRyxDQUNSLEdBQUcsRUFDSCx5QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLGtCQUFVLENBQUMsa0JBQWtCLENBQzlCLENBQUM7QUFHRixNQUFNLENBQUMsSUFBSSxDQUNULFdBQVcsRUFDWCx5QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLGtCQUFVLENBQUMsc0JBQXNCLENBQ2xDLENBQUM7QUFHRixNQUFNLENBQUMsR0FBRyxDQUNSLGlDQUFpQyxFQUNqQyx5QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLGtCQUFVLENBQUMsb0NBQW9DLENBQ2hELENBQUM7QUFHRixNQUFNLENBQUMsSUFBSSxDQUNULG1CQUFtQixFQUNuQix5QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLGtCQUFVLENBQUMsWUFBWSxDQUN4QixDQUFDO0FBR0YsTUFBTSxDQUFDLElBQUksQ0FDVCxrQkFBa0IsRUFDbEIseUJBQXVCLEVBQ3ZCLDZCQUE2QixFQUM3QixrQkFBVSxDQUFDLGtCQUFrQixDQUM5QixDQUFDO0FBUUYsTUFBTSxDQUFDLElBQUksQ0FDVCx1Q0FBdUMsRUFDdkMsOEJBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixrQkFBVSxDQUFDLGdDQUFnQyxDQUM1QyxDQUFDO0FBR0YsTUFBTSxDQUFDLElBQUksQ0FDVCx1Q0FBdUMsRUFDdkMsOEJBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixrQkFBVSxDQUFDLG1DQUFtQyxDQUMvQyxDQUFDO0FBR0YsTUFBTSxDQUFDLEtBQUssQ0FDVixjQUFjLEVBQ2QsOEJBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixrQkFBVSxDQUFDLGNBQWMsQ0FDMUIsQ0FBQztBQUdGLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysc0JBQXNCLEVBQ3RCLDhCQUFvQixFQUNwQiwwQkFBMEIsRUFDMUIsa0JBQVUsQ0FBQyxlQUFlLENBQzNCLENBQUM7QUFHRixNQUFNLENBQUMsS0FBSyxDQUNWLHNCQUFzQixFQUN0Qiw4QkFBb0IsRUFDcEIsMEJBQTBCLEVBQzFCLGtCQUFVLENBQUMsZUFBZSxDQUMzQixDQUFDO0FBR0YsTUFBTSxDQUFDLE1BQU0sQ0FDWCxjQUFjLEVBQ2QsOEJBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixrQkFBVSxDQUFDLGNBQWMsQ0FDMUIsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9