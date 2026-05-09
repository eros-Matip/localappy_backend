"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const goodPlan_1 = __importDefault(require("../controllers/goodPlan"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const Multer_1 = require("../middlewares/Multer");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);
router.get("/", IsAuthenticated_1.default, goodPlan_1.default.getPublicGoodPlans);
router.post("/position", IsAuthenticated_1.default, goodPlan_1.default.getGoodPlansByPosition);
router.post("/scan", IsAuthenticated_1.default, goodPlan_1.default.scanGoodPlanQr);
router.get("/establishment/:establishmentId", IsAuthenticated_1.default, goodPlan_1.default.getGoodPlansForAnEstablishmentPublic);
router.post("/:goodPlanId/read", IsAuthenticated_1.default, goodPlan_1.default.readGoodPlan);
router.post("/:goodPlanId/qr", IsAuthenticated_1.default, goodPlan_1.default.generateGoodPlanQr);
router.post("/establishment/:establishmentId/draft", OwnerIsAuthenticated_1.default, cpUpload, goodPlan_1.default.createGoodPlanForAnEstablishment);
router.post("/owner/establishment/:establishmentId", OwnerIsAuthenticated_1.default, goodPlan_1.default.getGoodPlansForAnEstablishmentOwner);
router.patch("/:goodPlanId", OwnerIsAuthenticated_1.default, cpUpload, goodPlan_1.default.updateGoodPlan);
router.patch("/:goodPlanId/publish", OwnerIsAuthenticated_1.default, goodPlan_1.default.publishGoodPlan);
router.patch("/:goodPlanId/disable", OwnerIsAuthenticated_1.default, goodPlan_1.default.disableGoodPlan);
router.delete("/:goodPlanId", OwnerIsAuthenticated_1.default, goodPlan_1.default.deleteGoodPlan);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR29vZFBsYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0dvb2RQbGFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUF5RDtBQUN6RCwrRkFBdUU7QUFDdkUscUZBQXFFO0FBQ3JFLGtEQUFxRDtBQUNyRCxvREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMscUJBQVksQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQU9oRSxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSx5QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBR2hGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsV0FBVyxFQUNYLHlCQUF1QixFQUN2QixrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FDMUMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsT0FBTyxFQUNQLHlCQUF1QixFQUN2QixrQkFBa0IsQ0FBQyxjQUFjLENBQ2xDLENBQUM7QUFHRixNQUFNLENBQUMsR0FBRyxDQUNSLGlDQUFpQyxFQUNqQyx5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsb0NBQW9DLENBQ3hELENBQUM7QUFHRixNQUFNLENBQUMsSUFBSSxDQUNULG1CQUFtQixFQUNuQix5QkFBdUIsRUFDdkIsa0JBQWtCLENBQUMsWUFBWSxDQUNoQyxDQUFDO0FBR0YsTUFBTSxDQUFDLElBQUksQ0FDVCxpQkFBaUIsRUFDakIseUJBQXVCLEVBQ3ZCLGtCQUFrQixDQUFDLGtCQUFrQixDQUN0QyxDQUFDO0FBY0YsTUFBTSxDQUFDLElBQUksQ0FDVCx1Q0FBdUMsRUFDdkMsOEJBQW9CLEVBQ3BCLFFBQVEsRUFDUixrQkFBa0IsQ0FBQyxnQ0FBZ0MsQ0FDcEQsQ0FBQztBQUdGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsdUNBQXVDLEVBQ3ZDLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxtQ0FBbUMsQ0FDdkQsQ0FBQztBQUdGLE1BQU0sQ0FBQyxLQUFLLENBQ1YsY0FBYyxFQUNkLDhCQUFvQixFQUNwQixRQUFRLEVBQ1Isa0JBQWtCLENBQUMsY0FBYyxDQUNsQyxDQUFDO0FBR0YsTUFBTSxDQUFDLEtBQUssQ0FDVixzQkFBc0IsRUFDdEIsOEJBQW9CLEVBQ3BCLGtCQUFrQixDQUFDLGVBQWUsQ0FDbkMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysc0JBQXNCLEVBQ3RCLDhCQUFvQixFQUNwQixrQkFBa0IsQ0FBQyxlQUFlLENBQ25DLENBQUM7QUFHRixNQUFNLENBQUMsTUFBTSxDQUNYLGNBQWMsRUFDZCw4QkFBb0IsRUFDcEIsa0JBQWtCLENBQUMsY0FBYyxDQUNsQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIn0=