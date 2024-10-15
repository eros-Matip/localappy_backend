"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Customer_1 = __importDefault(require("../controllers/Customer"));
const router = express_1.default.Router();
router.post("/create", Customer_1.default.createCustomer);
router.get("/get/:customerId", Customer_1.default.readCustomer);
router.get("/get/", Customer_1.default.readAll);
router.put("/update/:customerId", Customer_1.default.updateCustomer);
router.delete("/delete", Customer_1.default.deleteCustomer);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0N1c3RvbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUFpRDtBQUVqRCxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGtCQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDbEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3hELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGtCQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxrQkFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdELE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLGtCQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFcEQsa0JBQWUsTUFBTSxDQUFDIn0=