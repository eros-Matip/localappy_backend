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
router.get("/admin/stats/new-customers-per-day", AdminIsAuthenticated_1.default, AdminUsersControl_1.newCustomersPerDay);
router.get("/admin/stats/logins", AdminIsAuthenticated_1.default, adminStatsControl_1.getLoginStats);
router.get("/admin/stats/city-consultations", AdminIsAuthenticated_1.default, adminStatsControl_1.getCityConsultationStats);
router.get("/admin/stats/top-cities", AdminIsAuthenticated_1.default, adminStatsControl_1.getTopCities);
router.get("/admin/stats/qr-scans", AdminIsAuthenticated_1.default, adminStatsControl_1.getQrScanStats);
router.get("/admin/stats/top-scanned-establishments", AdminIsAuthenticated_1.default, adminStatsControl_1.getTopScannedEstablishments);
router.get("/admin/stats/dashboard", AdminIsAuthenticated_1.default, adminStatsControl_1.getDashboardStats);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5TdGF0c0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkbWluU3RhdHNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEscUNBQWlDO0FBQ2pDLHdFQUFzRTtBQUV0RSx3RUFPMEM7QUFDMUMsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sR0FBRSxDQUFDO0FBTXhCLE1BQU0sQ0FBQyxHQUFHLENBQ1Isb0NBQW9DLEVBQ3BDLDhCQUFvQixFQUNwQixzQ0FBa0IsQ0FDbkIsQ0FBQztBQU1GLE1BQU0sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsOEJBQW9CLEVBQUUsaUNBQWEsQ0FBQyxDQUFDO0FBQ3ZFLE1BQU0sQ0FBQyxHQUFHLENBQ1IsaUNBQWlDLEVBQ2pDLDhCQUFvQixFQUNwQiw0Q0FBd0IsQ0FDekIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsOEJBQW9CLEVBQUUsZ0NBQVksQ0FBQyxDQUFDO0FBQzFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsOEJBQW9CLEVBQUUsa0NBQWMsQ0FBQyxDQUFDO0FBQzFFLE1BQU0sQ0FBQyxHQUFHLENBQ1IseUNBQXlDLEVBQ3pDLDhCQUFvQixFQUNwQiwrQ0FBMkIsQ0FDNUIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsOEJBQW9CLEVBQUUscUNBQWlCLENBQUMsQ0FBQztBQUU5RSxrQkFBZSxNQUFNLENBQUMifQ==