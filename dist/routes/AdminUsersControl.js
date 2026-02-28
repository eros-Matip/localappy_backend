"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const AdminUsersControl_1 = require("../controllers/AdminUsersControl");
const router = (0, express_1.Router)();
router.get("/users", AdminIsAuthenticated_1.default, AdminUsersControl_1.usersList);
router.patch("/users/:userId/ban", AdminIsAuthenticated_1.default, AdminUsersControl_1.userBan);
router.patch("/users/:userId/unban", AdminIsAuthenticated_1.default, AdminUsersControl_1.userUnban);
router.patch("/users/:userId/activate", AdminIsAuthenticated_1.default, AdminUsersControl_1.userActivate);
router.patch("/users/:userId/disable", AdminIsAuthenticated_1.default, AdminUsersControl_1.userDisable);
router.patch("/users/:userId/premium", AdminIsAuthenticated_1.default, AdminUsersControl_1.userSetPremium);
router.delete("/users/:userId", AdminIsAuthenticated_1.default, AdminUsersControl_1.userDelete);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Vc2Vyc0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkbWluVXNlcnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEscUNBQWlDO0FBQ2pDLCtGQUF1RTtBQUN2RSx3RUFRMEM7QUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxHQUFFLENBQUM7QUFHeEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsOEJBQW9CLEVBQUUsNkJBQVMsQ0FBQyxDQUFDO0FBR3RELE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsOEJBQW9CLEVBQUUsMkJBQU8sQ0FBQyxDQUFDO0FBQ2xFLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsOEJBQW9CLEVBQUUsNkJBQVMsQ0FBQyxDQUFDO0FBQ3RFLE1BQU0sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsOEJBQW9CLEVBQUUsZ0NBQVksQ0FBQyxDQUFDO0FBQzVFLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsOEJBQW9CLEVBQUUsK0JBQVcsQ0FBQyxDQUFDO0FBRzFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsOEJBQW9CLEVBQUUsa0NBQWMsQ0FBQyxDQUFDO0FBRzdFLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsOEJBQW9CLEVBQUUsOEJBQVUsQ0FBQyxDQUFDO0FBRWxFLGtCQUFlLE1BQU0sQ0FBQyJ9