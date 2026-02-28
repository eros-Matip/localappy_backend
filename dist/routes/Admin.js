"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Admin_1 = __importDefault(require("../controllers/Admin"));
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
router.post("/create", AdminIsAuthenticated_1.default, Admin_1.default.createAdmin);
router.get("/dashboard", AdminIsAuthenticated_1.default, Admin_1.default.dashboard);
router.get("/dashboard/summary", AdminIsAuthenticated_1.default, Admin_1.default.summary);
router.get("/dashboard/distribution", AdminIsAuthenticated_1.default, Admin_1.default.distribution);
router.get("/dashboard/recentActivity", AdminIsAuthenticated_1.default, Admin_1.default.recentActivity);
router.get("/dashboard/topEstablishments", AdminIsAuthenticated_1.default, Admin_1.default.topEstablishments);
router.get("/dashboard/customersDashboard", AdminIsAuthenticated_1.default, Admin_1.default.customersDashboard);
router.get("/dashboard/adsDashboard", AdminIsAuthenticated_1.default, Admin_1.default.adsDashboard);
router.put("/update/:adminId", AdminIsAuthenticated_1.default, Admin_1.default.updateAdmin);
router.delete("/delete", AdminIsAuthenticated_1.default, Admin_1.default.deleteAdmin);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkbWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QywrRkFBdUU7QUFFdkUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsOEJBQW9CLEVBQUUsZUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsOEJBQW9CLEVBQUUsZUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNFLE1BQU0sQ0FBQyxHQUFHLENBQ1IseUJBQXlCLEVBQ3pCLDhCQUFvQixFQUNwQixlQUFVLENBQUMsWUFBWSxDQUN4QixDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FDUiwyQkFBMkIsRUFDM0IsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxjQUFjLENBQzFCLENBQUM7QUFDRixNQUFNLENBQUMsR0FBRyxDQUNSLDhCQUE4QixFQUM5Qiw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLGlCQUFpQixDQUM3QixDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FDUiwrQkFBK0IsRUFDL0IsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxrQkFBa0IsQ0FDOUIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQ1IseUJBQXlCLEVBQ3pCLDhCQUFvQixFQUNwQixlQUFVLENBQUMsWUFBWSxDQUN4QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDN0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsOEJBQW9CLEVBQUUsZUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXZFLGtCQUFlLE1BQU0sQ0FBQyJ9