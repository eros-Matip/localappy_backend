"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminCompaniesControl_1 = require("../controllers/AdminCompaniesControl");
const router = (0, express_1.Router)();
router.get("/companies", AdminCompaniesControl_1.listCompanies);
router.get("/companies/:id", AdminCompaniesControl_1.getCompanyById);
router.patch("/companies/:id/ban", AdminCompaniesControl_1.banCompany);
router.patch("/companies/:id/unban", AdminCompaniesControl_1.unbanCompany);
router.patch("/companies/:id/activate", AdminCompaniesControl_1.activateCompany);
router.patch("/companies/:id/disable", AdminCompaniesControl_1.disableCompany);
router.delete("/companies/:id", AdminCompaniesControl_1.deleteCompany);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Db21wYW5pZXNDb250cm9sLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9BZG1pbkNvbXBhbmllc0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBaUM7QUFDakMsZ0ZBUThDO0FBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sR0FBRSxDQUFDO0FBSXhCLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLHFDQUFhLENBQUMsQ0FBQztBQUN4QyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLHNDQUFjLENBQUMsQ0FBQztBQUM3QyxNQUFNLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLGtDQUFVLENBQUMsQ0FBQztBQUMvQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLG9DQUFZLENBQUMsQ0FBQztBQUNuRCxNQUFNLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLHVDQUFlLENBQUMsQ0FBQztBQUN6RCxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLHNDQUFjLENBQUMsQ0FBQztBQUN2RCxNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHFDQUFhLENBQUMsQ0FBQztBQUUvQyxrQkFBZSxNQUFNLENBQUMifQ==