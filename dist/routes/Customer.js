"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Customer_1 = __importDefault(require("../controllers/Customer"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const IsAuthenticated_2 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);
router.post("/create", Customer_1.default.createCustomer);
router.get("/get/:customerId", Customer_1.default.readCustomer);
router.get("/get/", Customer_1.default.readAll);
router.put("/update/:customerId", IsAuthenticated_1.default, cpUpload, Customer_1.default.updateCustomer);
router.put("/addingOrRemoveFavorites", IsAuthenticated_1.default, Customer_1.default.addingOrRemoveFavorites);
router.post("/inviteStaff/:establishmentId", OwnerIsAuthenticated_1.default, Customer_1.default.inviteStaff);
router.put("/respondToStaffInvitation/:invitationId", IsAuthenticated_2.default, Customer_1.default.respondToStaffInvitation);
router.delete("/delete", IsAuthenticated_1.default, Customer_1.default.deleteCustomer);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0N1c3RvbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUFpRDtBQUNqRCxxRkFBa0U7QUFDbEUsb0RBQTRCO0FBQzVCLGtEQUFxRDtBQUNyRCwrRkFBdUU7QUFDdkUscUZBQXFFO0FBRXJFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxFQUFDLHFCQUFZLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsa0JBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNsRCxNQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLGtCQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDeEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsa0JBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4QyxNQUFNLENBQUMsR0FBRyxDQUNSLHFCQUFxQixFQUNyQix5QkFBb0IsRUFDcEIsUUFBUSxFQUNSLGtCQUFVLENBQUMsY0FBYyxDQUMxQixDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FDUiwwQkFBMEIsRUFDMUIseUJBQW9CLEVBQ3BCLGtCQUFVLENBQUMsdUJBQXVCLENBQ25DLENBQUM7QUFFRixNQUFNLENBQUMsSUFBSSxDQUNULCtCQUErQixFQUMvQiw4QkFBb0IsRUFDcEIsa0JBQVUsQ0FBQyxXQUFXLENBQ3ZCLENBQUM7QUFHRixNQUFNLENBQUMsR0FBRyxDQUNSLHlDQUF5QyxFQUN6Qyx5QkFBdUIsRUFDdkIsa0JBQVUsQ0FBQyx3QkFBd0IsQ0FDcEMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLHlCQUFvQixFQUFFLGtCQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFMUUsa0JBQWUsTUFBTSxDQUFDIn0=