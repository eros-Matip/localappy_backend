"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Customer_1 = __importDefault(require("../controllers/Customer"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
router.post("/create", Customer_1.default.createCustomer);
router.get("/get/:customerId", IsAuthenticated_1.default, Customer_1.default.readCustomer);
router.get("/get/", IsAuthenticated_1.default, Customer_1.default.readAll);
router.put("/update/:customerId", IsAuthenticated_1.default, Customer_1.default.updateCustomer);
router.delete("/delete", IsAuthenticated_1.default, Customer_1.default.deleteCustomer);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0N1c3RvbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUFpRDtBQUNqRCxxRkFBa0U7QUFFbEUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxrQkFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUseUJBQW9CLEVBQUUsa0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM5RSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSx5QkFBb0IsRUFBRSxrQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlELE1BQU0sQ0FBQyxHQUFHLENBQ1IscUJBQXFCLEVBQ3JCLHlCQUFvQixFQUNwQixrQkFBVSxDQUFDLGNBQWMsQ0FDMUIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLHlCQUFvQixFQUFFLGtCQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFMUUsa0JBQWUsTUFBTSxDQUFDIn0=