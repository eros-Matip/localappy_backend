"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminUsersControl_1 = require("../controllers/AdminUsersControl");
const adminStatsControl_1 = require("../controllers/adminStatsControl");
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = (0, express_1.Router)();
router.get("/admin/stats/new-customers-per-day", AdminUsersControl_1.newCustomersPerDay);
router.get("/admin/stats/logins", AdminIsAuthenticated_1.default, adminStatsControl_1.getLoginStats);
router.get("/admin/stats/city-consultations", AdminIsAuthenticated_1.default, adminStatsControl_1.getCityConsultationStats);
router.get("/admin/stats/top-cities", AdminIsAuthenticated_1.default, adminStatsControl_1.getTopCities);
router.get("/admin/stats/qr-scans", AdminIsAuthenticated_1.default, adminStatsControl_1.getQrScanStats);
router.get("/admin/stats/top-scanned-establishments", AdminIsAuthenticated_1.default, adminStatsControl_1.getTopScannedEstablishments);
router.get("/admin/stats/dashboard", AdminIsAuthenticated_1.default, adminStatsControl_1.getDashboardStats);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5TdGF0c0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkbWluU3RhdHNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEscUNBQWlDO0FBQ2pDLHdFQUFzRTtBQUV0RSx3RUFPMEM7QUFDMUMsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sR0FBRSxDQUFDO0FBTXhCLE1BQU0sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLEVBQUUsc0NBQWtCLENBQUMsQ0FBQztBQU1yRSxNQUFNLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLDhCQUFvQixFQUFFLGlDQUFhLENBQUMsQ0FBQztBQUN2RSxNQUFNLENBQUMsR0FBRyxDQUNSLGlDQUFpQyxFQUNqQyw4QkFBb0IsRUFDcEIsNENBQXdCLENBQ3pCLENBQUM7QUFDRixNQUFNLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLDhCQUFvQixFQUFFLGdDQUFZLENBQUMsQ0FBQztBQUMxRSxNQUFNLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLDhCQUFvQixFQUFFLGtDQUFjLENBQUMsQ0FBQztBQUMxRSxNQUFNLENBQUMsR0FBRyxDQUNSLHlDQUF5QyxFQUN6Qyw4QkFBb0IsRUFDcEIsK0NBQTJCLENBQzVCLENBQUM7QUFDRixNQUFNLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLDhCQUFvQixFQUFFLHFDQUFpQixDQUFDLENBQUM7QUFFOUUsa0JBQWUsTUFBTSxDQUFDIn0=