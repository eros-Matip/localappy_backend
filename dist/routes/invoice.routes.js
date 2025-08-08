"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generateInvoicePdf_1 = require("../utils/generateInvoicePdf");
const router = (0, express_1.Router)();
router.get("/invoice/:registrationId", generateInvoicePdf_1.generateInvoicePdf);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2ljZS5yb3V0ZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL2ludm9pY2Uucm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscUNBQWlDO0FBQ2pDLG9FQUFpRTtBQUVqRSxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEdBQUUsQ0FBQztBQUV4QixNQUFNLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLHVDQUFrQixDQUFDLENBQUM7QUFFM0Qsa0JBQWUsTUFBTSxDQUFDIn0=