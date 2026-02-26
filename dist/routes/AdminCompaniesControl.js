"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminCompaniesControl_1 = require("../controllers/AdminCompaniesControl");
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = (0, express_1.Router)();
router.get("/companies", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.listCompanies);
router.get("/companies/:id", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.getCompanyById);
router.patch("/companies/:id/ban", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.banCompany);
router.patch("/companies/:id/unban", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.unbanCompany);
router.patch("/companies/:id/activate", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.activateCompany);
router.patch("/companies/:id/disable", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.disableCompany);
router.delete("/companies/:id", AdminIsAuthenticated_1.default, AdminCompaniesControl_1.deleteCompany);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Db21wYW5pZXNDb250cm9sLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9BZG1pbkNvbXBhbmllc0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxxQ0FBaUM7QUFDakMsZ0ZBUThDO0FBQzlDLCtGQUF1RTtBQUV2RSxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEdBQUUsQ0FBQztBQUl4QixNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSw4QkFBb0IsRUFBRSxxQ0FBYSxDQUFDLENBQUM7QUFDOUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSw4QkFBb0IsRUFBRSxzQ0FBYyxDQUFDLENBQUM7QUFDbkUsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSw4QkFBb0IsRUFBRSxrQ0FBVSxDQUFDLENBQUM7QUFDckUsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSw4QkFBb0IsRUFBRSxvQ0FBWSxDQUFDLENBQUM7QUFDekUsTUFBTSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSw4QkFBb0IsRUFBRSx1Q0FBZSxDQUFDLENBQUM7QUFDL0UsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSw4QkFBb0IsRUFBRSxzQ0FBYyxDQUFDLENBQUM7QUFDN0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSw4QkFBb0IsRUFBRSxxQ0FBYSxDQUFDLENBQUM7QUFFckUsa0JBQWUsTUFBTSxDQUFDIn0=